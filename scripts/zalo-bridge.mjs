#!/usr/bin/env node
/**
 * CẦU NỐI ZALO — nghe tin + danh bạ + gửi tin từ hàng đợi của app.
 *
 * Chạy trên MỘT MÁY LUÔN BẬT (Mac/PC/VPS của bạn) — server web không nói chuyện được
 * với Zalo. Giao thức Zalo nằm ở thư viện `zca-js` (MIT).
 *
 * Chạy:
 *   node scripts/zalo-bridge.mjs --login --nick=hotline1   # quét QR 1 lần, lưu phiên ~/.zalo-crm-session-hotline1.json
 *   node scripts/zalo-bridge.mjs --nick=hotline1           # chạy nền: nghe tin → Supabase (mỗi nick một tiến trình)
 *   node scripts/zalo-bridge.mjs --once --nick=hotline1    # chỉ đồng bộ danh bạ rồi thoát (dùng cho cron)
 *
 * LUẬT "hỏng phải kêu": đăng nhập hỏng / không đọc được danh bạ → exit 1 + ghi cờ vào
 * config `zalo_bridge_status`, TUYỆT ĐỐI không ghi đè số cũ bằng số rỗng.
 *
 * CẢNH BÁO: zca-js là API KHÔNG chính thức của Zalo — tài khoản có thể bị khoá.
 * Đọc phần "Rủi ro" trong README trước khi nối tài khoản quan trọng.
 */
import { Zalo, ThreadType } from "zca-js";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { execFileSync } from "child_process";
import ws from "ws";
globalThis.WebSocket = ws; // supabase-js cần WebSocket; Node 20 chưa có sẵn bản global
import { sdtTrongTen, chuanSdt } from "./lib/zalo-chuan.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dir, "../.env.local"), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#")).map((l) => { const [k, ...r] = l.split("="); return [k.trim(), r.join("=").trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// MỖI NICK MỘT PHIÊN: `--nick=hotline1` -> ~/.zalo-crm-session-hotline1.json + QR ~/Downloads/zalo-qr-hotline1.png.
// Chạy mỗi nick một tiến trình; bảng ghi theo own_id nên không lẫn.
const NICK = (process.argv.find((a) => a.startsWith("--nick=")) || "--nick=mac-dinh").slice(7).replace(/[^a-z0-9-]/gi, "").toLowerCase() || "mac-dinh";
const PHIEN = join(homedir(), `.zalo-crm-session-${NICK}.json`);
const LOGIN = process.argv.includes("--login");
// --qr-len-kho: đẩy QR + tiến độ đăng nhập lên config `zalo_ket_noi_trang_thai` để màn
// /zalo/ket-noi trên web hiện mã cho người quét bằng điện thoại — không cần đứng cạnh máy.
const QR_LEN_KHO = process.argv.includes("--qr-len-kho");
async function baoTienDo(buoc, them = {}) {
  if (!QR_LEN_KHO) return;
  try {
    await sb.from("config").upsert({ key: "zalo_ket_noi_trang_thai", value: JSON.stringify({ nick: NICK, buoc, luc: new Date().toISOString(), ...them }) }, { onConflict: "key" });
  } catch { /* không đẩy được thì QR vẫn nằm ở file trên máy */ }
}
const ONCE = process.argv.includes("--once");

// ─────────────────────────────────────────────────────────────────────────────
// Tiện ích
// ─────────────────────────────────────────────────────────────────────────────

/** Nhãn dễ đọc cho tin không phải chữ (bản đầu không tải ảnh/video về). */
function nhanLoai(msgType) {
  const m = {
    "chat.photo": "Hình ảnh",
    "chat.video.msg": "Video",
    "chat.voice": "Ghi âm",
    "share.file": "Tệp",
    "chat.sticker": "Sticker",
    "chat.location": "Vị trí",
    "chat.gif": "Ảnh động",
  };
  return m[msgType] || "Tin đính kèm";
}

/** Lấy phần CHỮ của tin. content là object khi đính kèm → lấy title, không thì gắn nhãn. */
function chuCuaTin(d) {
  const c = d?.content;
  // Zalo có tin mà content là MÃ HÀNH ĐỘNG (ví dụ "sendBubbleMessage") — một từ camelCase
  // không dấu cách. Không phải lời khách → gắn nhãn theo msgType, log bản thô để soi.
  if (typeof c === "string" && /^[a-z]+[A-Za-z]{6,}$/.test(c.trim()) && !/\s/.test(c.trim())) {
    console.log("[cầu Zalo] tin content=mã hành động:", JSON.stringify({ msgType: d?.msgType, content: c }).slice(0, 300));
    return `[${nhanLoai(d?.msgType)}]`;
  }
  if (typeof c === "string") return c;
  if (c && typeof c === "object") {
    if (typeof c.title === "string" && c.title.trim()) return c.title.trim();
    if (typeof c.description === "string" && c.description.trim()) return c.description.trim();
  }
  return `[${nhanLoai(d?.msgType)}]`;
}

async function ghiTrangThai(fields) {
  const at = new Date().toISOString();
  await sb.from("config").upsert({ key: "zalo_bridge_status", value: JSON.stringify({ at, ...fields }) }, { onConflict: "key" });
  // Nhịp RIÊNG TỪNG NICK (`zalo_bridge_nick` = {ownId: {...}}) — trạng thái sống/chết
  // từng nick mà app đọc để gắn nhãn "Nick OFF".
  if (fields.ownId) {
    try {
      const { data } = await sb.from("config").select("value").eq("key", "zalo_bridge_nick").maybeSingle();
      const m = (() => { try { return JSON.parse(data?.value || "{}"); } catch { return {}; } })();
      m[String(fields.ownId)] = { at, nick: NICK, ok: !!fields.ok, ten: fields.ten || null, error: fields.error || null };
      await sb.from("config").upsert({ key: "zalo_bridge_nick", value: JSON.stringify(m) }, { onConflict: "key" });
    } catch { /* nhịp chung vẫn còn */ }
  }
}

async function chet(lyDo) {
  console.error("[cầu Zalo] HỎNG:", lyDo);
  await ghiTrangThai({ ok: false, error: String(lyDo) }).catch(() => {});
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Đăng nhập
// ─────────────────────────────────────────────────────────────────────────────

/** Zalo chỉ cho mã QR sống ~90 giây — quá gấp khi người quét không ngồi sẵn. Xin lại mã
 *  tối đa 10 lượt (~15 phút); mã mới ghi đè cùng file, người chỉ việc quét cái đang hiện. */
async function dangNhapQR() {
  for (let luot = 1; luot <= 10; luot++) {
    try { return await dangNhapQRMotLuot(luot); }
    catch (e) {
      if (!/scan result|expired/i.test(String(e?.message || e))) throw e;
      console.log(`[cầu Zalo] Mã hết hạn (lượt ${luot}/10) — xin mã mới...`);
    }
  }
  await baoTienDo("het-han");
  await chet(`hết 10 lượt xin mã QR mà chưa ai quét — chạy lại --login --nick=${NICK} khi sẵn sàng quét`);
}

async function dangNhapQRMotLuot(luot) {
  const zalo = new Zalo();
  const qrPath = join(homedir(), "Downloads", `zalo-qr-${NICK}.png`);
  let creds = null;

  console.log("[cầu Zalo] Đang xin mã QR...");
  const api = await zalo.loginQR({ qrPath }, (ev) => {
    // 0 QRCodeGenerated · 2 QRCodeScanned · 4 GotLoginInfo (xem LoginQRCallbackEventType của zca-js)
    if (ev.type === 0) {
      baoTienDo("cho-quet", { qr: ev.data?.image || null, luot });   // base64 PNG, web vẽ thẳng data:image/png
      // zca-js 2.x: có callback thì KHÔNG tự lưu file — phải gọi actions.saveToFile
      ev.actions?.saveToFile?.(qrPath).then(() => {
        console.log(`[cầu Zalo] Mã QR (lượt ${luot}) đã lưu: ${qrPath} — mở Zalo trên điện thoại, vào Thêm > Quét mã QR.`);
        // Web đã có mã thì đừng bung cửa sổ trên máy mỗi 90 giây. Lệnh `open` chỉ có trên macOS.
        if (!QR_LEN_KHO && process.platform === "darwin") { try { execFileSync("/usr/bin/open", [qrPath]); } catch { /* mở tay */ } }
      });
      return;
    }
    if (ev.type === 2) { console.log(`[cầu Zalo] Đã quét — xác nhận trên điện thoại: ${ev.data?.display_name || ""}`); baoTienDo("da-quet", { ten: ev.data?.display_name || null }); }
    if (ev.type === 4) creds = { imei: ev.data.imei, cookie: ev.data.cookie, userAgent: ev.data.userAgent };
  });

  if (!creds) await chet("không lấy được thông tin đăng nhập sau khi quét QR");
  writeFileSync(PHIEN, JSON.stringify(creds, null, 2));
  chmodSync(PHIEN, 0o600); // phiên = chìa khoá vào Zalo, chỉ chủ máy đọc được
  console.log(`[cầu Zalo] Đã lưu phiên vào ${PHIEN} (quyền 600). Lần sau không cần quét lại.`);
  await baoTienDo("da-noi");
  return api;
}

async function dangNhapLai() {
  if (!existsSync(PHIEN)) await chet(`chưa có phiên cho nick "${NICK}" — chạy: node scripts/zalo-bridge.mjs --login --nick=${NICK}`);
  const creds = JSON.parse(readFileSync(PHIEN, "utf8"));
  try {
    return await new Zalo().login(creds);
  } catch (e) {
    await chet(`phiên hết hạn hoặc bị đăng xuất (${e?.message || e}) — chạy lại với --login`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ghi dữ liệu
// ─────────────────────────────────────────────────────────────────────────────

async function luuNick(api) {
  const ownId = String(api.getOwnId());
  let ten = null;
  try {
    const info = await api.fetchAccountInfo();
    ten = info?.profile?.displayName || info?.profile?.zaloName || null;
  } catch { /* không lấy được tên thì thôi, uid mới là thứ bắt buộc */ }
  await sb.from("zalo_bridge_accounts").upsert(
    { own_id: ownId, display_name: ten, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: "own_id" }
  );
  return { ownId, ten };
}

/** Đồng bộ danh bạ bạn bè. */
async function dongBoBanBe(api, ownId) {
  let ban = [];
  try {
    ban = (await api.getAllFriends()) || [];
  } catch (e) {
    await chet(`không đọc được danh bạ: ${e?.message || e}`);
  }
  if (!ban.length) {
    // Nick mới tinh thì 0 bạn là BÌNH THƯỜNG, không phải hỏng — chỉ ghi nhận, không exit.
    console.log("[cầu Zalo] Danh bạ trống (nick mới chưa có bạn nào).");
    return 0;
  }
  // KHÔNG GHI ĐÈ DỮ LIỆU ĐÃ CÓ BẰNG NULL. Zalo trả phoneNumber gần như rỗng; số thật thường
  // nằm trong TÊN người dùng tự đặt ("Chị A HP 0381234567") -> bóc bằng sdtTrongTen. Chỉ ghi
  // cột phone khi CÓ số; dòng không có số thì bỏ hẳn hai cột đó khỏi upsert. PostgREST lấy
  // tập cột của CẢ LÔ và ghi NULL cho cột thiếu nếu trộn chung -> tách lô theo hình dạng dòng.
  // KHÔNG ĐÈ TÊN ĐÃ CÓ: tên gợi nhớ người dùng tự đặt quý hơn tên Zalo công khai — đọc trước
  // danh sách uid đã có tên, chỉ điền tên cho dòng CHƯA có.
  const daCoTen = new Set();
  for (let tu = 0; ; tu += 1000) {
    const { data } = await sb.from("zalo_bridge_contacts").select("zalo_uid").eq("own_id", ownId).not("display_name", "is", null).order("zalo_uid").range(tu, tu + 999);
    for (const r of data || []) daCoTen.add(String(r.zalo_uid));
    if (!data || data.length < 1000) break;
  }
  const now = new Date().toISOString();
  const rows = ban.map((b) => {
    const uid = String(b.userId || b.uid);
    const ten = b.displayName || b.zaloName || null;
    const sdt = chuanSdt(b.phoneNumber) || sdtTrongTen(ten || "");
    const r = { own_id: ownId, zalo_uid: uid, la_ban_be: true, updated_at: now };
    if (ten && !daCoTen.has(uid)) r.display_name = ten;
    if (b.zaloName) r.zalo_name = b.zaloName;
    if (sdt) { r.phone = b.phoneNumber || sdt; r.phone_norm = chuanSdt(sdt); }
    return r;
  }).filter((r) => r.zalo_uid && r.zalo_uid !== "undefined");

  // Tách lô theo TẬP CỘT của dòng (PostgREST ghi NULL cho cột thiếu nếu trộn chung lô).
  const theoHinh = new Map();
  for (const r of rows) { const k = Object.keys(r).sort().join(","); (theoHinh.get(k) || theoHinh.set(k, []).get(k)).push(r); }
  for (const lo of theoHinh.values()) for (let i = 0; i < lo.length; i += 500) {
    const { error } = await sb.from("zalo_bridge_contacts").upsert(lo.slice(i, i + 500), { onConflict: "own_id,zalo_uid" });
    if (error) await chet(`ghi danh bạ lỗi: ${error.message}`);
  }
  console.log(`[cầu Zalo] Danh bạ: ${rows.length} người (${rows.filter((r) => r.phone_norm).length} có SĐT).`);
  return rows.length;
}

async function luuTin(ownId, msg) {
  const d = msg?.data;
  if (!d?.msgId) return;
  const laNhom = msg.type === ThreadType.Group;
  const raNgoai = !!msg.isSelf; // mình gửi
  const khiNao = new Date(Number(d.ts) || Date.now()).toISOString();
  const uidKhach = laNhom ? null : (raNgoai ? String(msg.threadId) : String(d.uidFrom));

  // Tin: chống trùng bằng msg_id (listener bắn lại khi nối lại kết nối).
  const { error } = await sb.from("zalo_bridge_messages").upsert({
    msg_id: String(d.msgId),
    own_id: ownId,
    thread_id: String(msg.threadId),
    thread_type: laNhom ? "group" : "user",
    zalo_uid: String(d.uidFrom),
    direction: raNgoai ? "out" : "in",
    content: chuCuaTin(d),
    sent_at: khiNao,
  }, { onConflict: "msg_id", ignoreDuplicates: true });
  if (error) { console.error("[cầu Zalo] ghi tin lỗi:", error.message); return; }

  // Nhóm cũng phải có dòng hội thoại (để tab Nhóm hiện); khách 1-1 thì thêm cờ "đang chờ".
  const uidDong = laNhom ? String(msg.threadId) : uidKhach;
  if (!uidDong) return;
  const { data: cu } = await sb.from("zalo_bridge_contacts")
    .select("id,msg_count,display_name").eq("own_id", ownId).eq("zalo_uid", uidDong).maybeSingle();
  const chu = chuCuaTin(d);
  await sb.from("zalo_bridge_contacts").upsert({
    own_id: ownId,
    zalo_uid: uidDong,
    thread_type: laNhom ? "group" : "user",
    // chỉ điền tên khi kho CHƯA có — tên gợi nhớ người dùng đặt quý hơn tên Zalo công khai
    ...(!raNgoai && d.dName && !cu?.display_name ? { display_name: d.dName } : {}),
    last_msg_at: khiNao,
    last_content: chu, last_type: d?.msgType || "text",
    ...(laNhom
      ? {}
      : raNgoai
        ? { last_out_at: khiNao, unreplied: false }
        : { last_in_at: khiNao, unreplied: true, unread_count: 1 }),
    msg_count: (cu?.msg_count || 0) + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: "own_id,zalo_uid" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Chạy
// ─────────────────────────────────────────────────────────────────────────────

const api = LOGIN ? await dangNhapQR() : await dangNhapLai();
const { ownId, ten } = await luuNick(api);
console.log(`[cầu Zalo] Đã nối nick: ${ten || "(không rõ tên)"} — uid ${ownId}`);

const soBan = await dongBoBanBe(api, ownId);

if (ONCE) {
  await ghiTrangThai({ ok: true, ownId, ten, friends: soBan, mode: "once" });
  console.log("[cầu Zalo] Xong (chế độ --once).");
  process.exit(0);
}

let demTin = 0;
api.listener.on("connected", async () => {
  console.log("[cầu Zalo] Đã kết nối, đang nghe tin...");
  await ghiTrangThai({ ok: true, ownId, ten, friends: soBan, messages: demTin, mode: "listen" });
});
api.listener.on("message", async (msg) => {
  try {
    await luuTin(ownId, msg);
    demTin++;
    // Nhịp tim (10 tin/lần, tránh ghi config liên tục).
    if (demTin % 10 === 0) await ghiTrangThai({ ok: true, ownId, ten, friends: soBan, messages: demTin, mode: "listen" });
  } catch (e) {
    console.error("[cầu Zalo] lỗi xử lý tin:", e?.message || e);
  }
});
// THU HỒI: kho KHÔNG xoá, KHÔNG ghi đè tin đã lưu (ignoreDuplicates) — chỉ ghi dấu vào
// config `zalo_thu_hoi`, hộp thư hiện tin gốc kèm nhãn "đã thu hồi lúc…".
// Zalo gửi globalMsgId + cliMsgId, lưu cả hai để khớp.
api.listener.on("undo", async (u) => {
  try {
    const d = u?.data; if (!d) return;
    const ids = [d.content?.globalMsgId, d.content?.cliMsgId, d.msgId].filter(Boolean).map(String);
    const { data } = await sb.from("config").select("value").eq("key", "zalo_thu_hoi").maybeSingle();
    const so = (() => { try { return JSON.parse(data?.value || "{}"); } catch { return {}; } })();
    so[`${ownId}|${ids[0]}`] = { own: ownId, thread: String(u.threadId || d.idTo || ""), ids, boi: String(d.uidFrom || ""), boiTen: d.dName || null, luc: new Date(Number(d.ts) || Date.now()).toISOString() };
    // giữ sổ gọn: 5.000 mục gần nhất
    const keys = Object.keys(so); if (keys.length > 5000) for (const k of keys.slice(0, keys.length - 5000)) delete so[k];
    await sb.from("config").upsert({ key: "zalo_thu_hoi", value: JSON.stringify(so) }, { onConflict: "key" });
    console.log(`[cầu Zalo] THU HỒI: ${d.dName || d.uidFrom} thu hồi tin ${ids[0]} trong ${u.threadId}`);
  } catch (e) { console.error("[cầu Zalo] lỗi ghi thu hồi:", e?.message || e); }
});
api.listener.on("error", (e) => console.error("[cầu Zalo] lỗi listener:", e?.message || e));
api.listener.on("closed", async (code, reason) => {
  // 3000 DuplicateConnection / 3003 KickConnection = nick đang đăng nhập chỗ khác đá mình ra.
  await ghiTrangThai({ ok: false, ownId, ten, error: `mất kết nối (${code}) ${reason || ""}` });
  console.error(`[cầu Zalo] Mất kết nối: ${code} ${reason || ""}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// GỬI TIN TỪ APP — hàng đợi config `zalo_gui_cho` do route /api/hop-thu-zalo/gui xếp vào
// SAU KHI đã qua cửa từ cấm. Cầu chỉ gửi mục của ĐÚNG nick mình (own === ownId); gửi xong
// đổi msg_id `app-cho:<id>` -> mã Zalo thật, hỏng -> `app-loi:<id>`.
// Poll 5 giây; mỗi lượt tối đa 5 tin để nick không giống máy spam.
// ─────────────────────────────────────────────────────────────────────────────
let dangDaySong = false;
async function dayHangDoiGui() {
  if (dangDaySong) return; dangDaySong = true;
  try {
    const { data } = await sb.from("config").select("value").eq("key", "zalo_gui_cho").maybeSingle();
    const hang = (() => { try { return JSON.parse(data?.value || "{}"); } catch { return {}; } })();
    const cuaToi = Object.entries(hang).filter(([, v]) => String(v?.own) === String(ownId)).slice(0, 5);
    if (!cuaToi.length) return;
    for (const [id, v] of cuaToi) {
      let ketQua = null, loi = null;
      try {
        ketQua = await api.sendMessage(String(v.noiDung), String(v.uid), v.kieu === "group" ? ThreadType.Group : ThreadType.User);
      } catch (e) { loi = e?.message || String(e); }
      const msgIdMoi = ketQua?.message?.msgId ? String(ketQua.message.msgId) : (loi ? `app-loi:${id}` : `app-da-gui:${id}`);
      await sb.from("zalo_bridge_messages").update({ msg_id: msgIdMoi }).eq("msg_id", `app-cho:${id}`);
      delete hang[id];
      console.log(loi ? `[cầu Zalo] GỬI HỎNG tới ${v.uid}: ${loi}` : `[cầu Zalo] đã gửi tới ${v.uid} (${String(v.noiDung).slice(0, 40)}...)`);
      await new Promise((r) => setTimeout(r, 1200));   // giãn nhịp giữa hai tin
    }
    // Ghi lại hàng đợi ĐÃ TRỪ phần của mình; nick khác vẫn còn nguyên mục của họ.
    const { data: moi } = await sb.from("config").select("value").eq("key", "zalo_gui_cho").maybeSingle();
    const hangMoi = (() => { try { return JSON.parse(moi?.value || "{}"); } catch { return {}; } })();
    for (const [id] of cuaToi) delete hangMoi[id];
    await sb.from("config").upsert({ key: "zalo_gui_cho", value: JSON.stringify(hangMoi) }, { onConflict: "key" });
  } catch (e) {
    console.error("[cầu Zalo] lỗi hàng đợi gửi:", e?.message || e);
  } finally { dangDaySong = false; }
}
setInterval(() => { dayHangDoiGui().catch(() => {}); }, 5000);

// Nhịp tim mỗi 10 phút — kể cả khi không có tin nào, app vẫn thấy cầu sống.
setInterval(() => {
  ghiTrangThai({ ok: true, ownId, ten, friends: soBan, messages: demTin, mode: "listen" }).catch(() => {});
}, 10 * 60 * 1000);

api.listener.start({ retryOnClose: true });
