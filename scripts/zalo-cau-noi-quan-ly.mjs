#!/usr/bin/env node
/**
 * QUẢN LÝ CẦU NỐI ZALO — chạy nền trên máy luôn bật (launchd/systemd/pm2, KeepAlive).
 *
 * Hai việc, 5 giây một vòng:
 *  1. NHẬN YÊU CẦU KẾT NỐI từ web: màn /zalo/ket-noi ghi config `zalo_ket_noi_yeu_cau`
 *     {nick, boi, luc, trangThai:"cho"} → bật `zalo-bridge.mjs --login --nick=<nick> --qr-len-kho`;
 *     bridge tự đẩy QR + tiến độ lên config `zalo_ket_noi_trang_thai` cho web vẽ. Người quét
 *     bằng điện thoại ở bất cứ đâu, không cần đứng cạnh máy.
 *  2. GIỮ MỖI NICK MỘT TIẾN TRÌNH SỐNG: nick nào đã có phiên (~/.zalo-crm-session-<nick>.json)
 *     mà chưa có tiến trình thì bật `zalo-bridge.mjs --nick=<nick>`; chết thì 30 giây sau bật
 *     lại. (Bị đá vì đăng nhập chỗ khác — DuplicateConnection — thì phiên hỏng, bật lại cũng
 *     chết; lúc đó `zalo_bridge_status` đỏ và người phải quét lại ở /zalo/ket-noi.)
 *  Nhịp tim `zalo_cau_noi_last` mỗi vòng — web đọc để biết "máy cầu nối có đang chạy không".
 *
 * Luật "hỏng phải kêu": không nối được Supabase thì thoát 1 để trình giữ tiến trình bật lại.
 */
import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import ws from "ws"; globalThis.WebSocket = ws;

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(readFileSync(resolve(__dir, "../.env.local"), "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => { const [k, ...r] = l.split("="); return [k.trim(), r.join("=").trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const BRIDGE = resolve(__dir, "zalo-bridge.mjs");

const tienTrinh = new Map();   // nick -> { child, tu, login }
const chetLuc = new Map();     // nick -> mốc chết gần nhất (để đợi 30s mới bật lại)

const nickCoPhien = () => readdirSync(homedir()).filter((f) => /^\.zalo-crm-session-[a-z0-9-]+\.json$/.test(f)).map((f) => f.replace(/^\.zalo-crm-session-|\.json$/g, ""));

function bat(nick, login) {
  const args = [BRIDGE, `--nick=${nick}`, ...(login ? ["--login", "--qr-len-kho"] : [])];
  const child = spawn(process.execPath, args, { stdio: ["ignore", "inherit", "inherit"] });
  console.log(`[quản lý] bật ${login ? "ĐĂNG NHẬP" : "cầu"} nick=${nick} pid=${child.pid}`);
  tienTrinh.set(nick, { child, tu: Date.now(), login });
  child.on("exit", (code) => {
    console.log(`[quản lý] nick=${nick} thoát mã ${code}`);
    tienTrinh.delete(nick); chetLuc.set(nick, Date.now());
  });
}

async function vong() {
  // 1. yêu cầu kết nối từ web
  try {
    const { data } = await sb.from("config").select("value").eq("key", "zalo_ket_noi_yeu_cau").maybeSingle();
    const yc = JSON.parse(data?.value || "null");
    if (yc?.trangThai === "cho" && /^[a-z0-9-]{1,20}$/.test(yc.nick || "")) {
      const nick = yc.nick;
      // đang có tiến trình cũ của nick này (kể cả cầu đang chạy) thì tắt để đăng nhập lại từ đầu
      const cu = tienTrinh.get(nick); if (cu) { try { cu.child.kill(); } catch {} tienTrinh.delete(nick); }
      await sb.from("config").upsert({ key: "zalo_ket_noi_yeu_cau", value: JSON.stringify({ ...yc, trangThai: "dang-lay-qr", nhanLuc: new Date().toISOString() }) }, { onConflict: "key" });
      await sb.from("config").upsert({ key: "zalo_ket_noi_trang_thai", value: JSON.stringify({ nick, buoc: "dang-lay-qr", luc: new Date().toISOString() }) }, { onConflict: "key" });
      bat(nick, true);
    }
  } catch (e) { console.error("[quản lý] lỗi đọc yêu cầu:", e?.message || e); }

  // 2. giữ cầu sống cho mọi nick đã có phiên
  for (const nick of nickCoPhien()) {
    if (tienTrinh.has(nick)) continue;
    if ((Date.now() - (chetLuc.get(nick) || 0)) < 30_000) continue;
    bat(nick, false);
  }

  // 3. nhịp tim
  const dang = [...tienTrinh.entries()].map(([n, t]) => ({ nick: n, pid: t.child.pid, login: t.login, tuLuc: new Date(t.tu).toISOString() }));
  // (bẫy: builder của supabase-js chỉ chạy khi được await — `.catch?.()` trên nó là KHÔNG chạy gì cả)
  try { await sb.from("config").upsert({ key: "zalo_cau_noi_last", value: JSON.stringify({ at: new Date().toISOString(), dang, phien: nickCoPhien() }) }, { onConflict: "key" }); }
  catch (e) { console.error("[quản lý] lỗi nhịp tim:", e?.message || e); }
}

// Kiểm Supabase trước — không nối được thì kêu và thoát để trình giữ tiến trình bật lại
// (không ngồi im giả vờ chạy).
try { const { error } = await sb.from("config").select("key").limit(1); if (error) throw error; }
catch (e) { console.error("[quản lý] không nối được Supabase:", e?.message || e); process.exit(1); }

console.log("[quản lý] cầu nối Zalo — đang canh yêu cầu kết nối + giữ cầu sống (5s/vòng)");
await vong();
setInterval(() => vong().catch((e) => console.error("[quản lý] lỗi vòng:", e?.message || e)), 5000);
