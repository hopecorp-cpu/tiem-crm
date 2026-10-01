import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase-server";
import { chuanSdt } from "@/lib/chung";
import type { FbKhach, FbTin, FbTrang } from "@/lib/facebook";

export const G = "https://graph.facebook.com/v21.0";

/**
 * XÁC THỰC WEBHOOK — bắt buộc, không phải tuỳ chọn.
 * Đường webhook là địa chỉ CÔNG KHAI: ai cũng POST vào được. Không kiểm chữ ký thì
 * người lạ bơm tin giả vào hộp thư của tiệm, và tệ hơn là kích bot trả lời.
 * Meta ký HMAC-SHA256 THÂN THÔ bằng App Secret, gửi ở header `x-hub-signature-256`.
 */
export function chuKyDung(thanTho: string, chuKy: string | null, appSecret: string): boolean {
  if (!chuKy || !appSecret) return false;
  const nhan = "sha256=" + createHmac("sha256", appSecret).update(thanTho, "utf8").digest("hex");
  const a = Buffer.from(nhan), b = Buffer.from(chuKy);
  // So sánh theo thời gian hằng — so bằng === là rò thông tin qua thời gian chạy.
  return a.length === b.length && timingSafeEqual(a, b);
}

/* --------------------------------------------------------------- TRANG */

export async function layTrang(chiActive = false): Promise<FbTrang[]> {
  const sb = getServiceClient();
  let q = sb.from("fb_pages").select("page_id,ten,da_dang_ky,active,loi_cuoi,kiem_luc,token");
  if (chiActive) q = q.eq("active", true);
  const { data } = await q;
  return (data || []).map((r: any) => ({
    pageId: r.page_id, ten: r.ten, daDangKy: !!r.da_dang_ky, active: r.active !== false,
    loiCuoi: r.loi_cuoi, kiemLuc: r.kiem_luc,
    duoiToken: String(r.token || "").slice(-4),   // CHỈ 4 ký tự cuối rời khỏi máy chủ
  }));
}

async function tokenCuaTrang(pageId: string): Promise<string | null> {
  const { data } = await getServiceClient().from("fb_pages").select("token,active").eq("page_id", pageId).maybeSingle();
  return data && data.active !== false ? data.token : null;
}

/** Kiểm token còn sống không + lấy tên trang. Hỏng thì GHI LẠI để màn hình báo đỏ. */
export async function kiemTrang(pageId: string): Promise<{ ok: boolean; ten?: string; loi?: string }> {
  const tok = await tokenCuaTrang(pageId);
  if (!tok) return { ok: false, loi: "Không có token" };
  try {
    const r = await fetch(`${G}/${pageId}?fields=id,name&access_token=${encodeURIComponent(tok)}`);
    const j: any = await r.json();
    const sb = getServiceClient();
    if (j?.error) {
      await sb.from("fb_pages").update({ loi_cuoi: j.error.message, kiem_luc: new Date().toISOString() }).eq("page_id", pageId);
      return { ok: false, loi: j.error.message };
    }
    await sb.from("fb_pages").update({ ten: j.name, loi_cuoi: null, kiem_luc: new Date().toISOString() }).eq("page_id", pageId);
    return { ok: true, ten: j.name };
  } catch (e: any) {
    return { ok: false, loi: String(e?.message || e) };
  }
}

/** Bật nhận sự kiện tin nhắn cho trang. KHÔNG tự chạy — người bấm nút mới chạy. */
export async function dangKyWebhook(pageId: string): Promise<{ ok: boolean; loi?: string }> {
  const tok = await tokenCuaTrang(pageId);
  if (!tok) return { ok: false, loi: "Không có token" };
  const r = await fetch(`${G}/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${encodeURIComponent(tok)}`, { method: "POST" });
  const j: any = await r.json().catch(() => ({}));
  if (j?.error) return { ok: false, loi: j.error.message };
  await getServiceClient().from("fb_pages").update({ da_dang_ky: true }).eq("page_id", pageId);
  return { ok: true };
}

/* --------------------------------------------------------------- GỬI TIN */

/**
 * Gửi tin cho khách. Trả lỗi NÓI ĐƯỢC THÀNH LỜI thay vì ném mã Facebook —
 * lễ tân đọc "Unsupported post request" thì không biết phải làm gì.
 */
export async function guiTin(
  pageId: string, psid: string, noiDung: string, boi: string
): Promise<{ ok: boolean; mid?: string; loi?: string }> {
  const tok = await tokenCuaTrang(pageId);
  if (!tok) return { ok: false, loi: "Trang này chưa nối hoặc đang tắt" };

  const r = await fetch(`${G}/${pageId}/messages?access_token=${encodeURIComponent(tok)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: psid }, messaging_type: "RESPONSE", message: { text: noiDung } }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (j?.error) {
    const ma = j.error.code, phu = j.error.error_subcode;
    let loi = j.error.message || "Facebook từ chối";
    if (ma === 10 && phu === 2018278) loi = "Quá 24 giờ kể từ tin cuối của khách — Facebook chặn. Gọi điện hoặc nhắn Zalo cho khách nhé.";
    else if (ma === 190) loi = "Token của trang hết hạn, vào Kết nối Facebook dán lại token mới.";
    else if (ma === 200) loi = "Ứng dụng chưa đủ quyền nhắn tin (pages_messaging) — xem phần cài đặt trong README.";
    return { ok: false, loi };
  }

  const luc = new Date().toISOString();
  const sb = getServiceClient();
  const mid = j?.message_id || `app:${Date.now()}`;
  await sb.from("fb_messages").insert({ mid, page_id: pageId, psid, direction: "out", content: noiDung, boi, sent_at: luc });
  await sb.from("fb_contacts").update({
    last_out_at: luc, last_msg_at: luc, last_content: noiDung, unreplied: false, updated_at: luc,
  }).eq("page_id", pageId).eq("psid", psid);
  return { ok: true, mid };
}

/* ------------------------------------------------------------ NHẬN TIN */

/** Ghi một tin KHÁCH gửi vào. Trả về hồ sơ khách để lớp trên quyết có gọi bot không. */
export async function nhanTin(
  pageId: string, psid: string, mid: string, noiDung: string, luc: string
): Promise<{ moi: boolean; botTat: boolean; soTinRa: number }> {
  const sb = getServiceClient();

  // mid UNIQUE — Facebook gửi lại cùng một sự kiện là chuyện thường, chống nhân đôi ở đây.
  const { error } = await sb.from("fb_messages")
    .insert({ mid, page_id: pageId, psid, direction: "in", content: noiDung, sent_at: luc });
  const trung = !!error && String((error as any).code) === "23505";

  const { data: cu } = await sb.from("fb_contacts").select("msg_count,bot_tat").eq("page_id", pageId).eq("psid", psid).maybeSingle();
  await sb.from("fb_contacts").upsert({
    page_id: pageId, psid,
    last_content: noiDung, last_msg_at: luc, last_in_at: luc, unreplied: true,
    msg_count: (cu?.msg_count || 0) + (trung ? 0 : 1), updated_at: luc,
  }, { onConflict: "page_id,psid" });

  // Khách nhắn lại sau khi nhân viên đã vào tay -> đếm số lượt bot đã nói liên tiếp
  const { count } = await sb.from("fb_messages").select("mid", { count: "exact", head: true })
    .eq("page_id", pageId).eq("psid", psid).eq("direction", "out").eq("boi", "bot");
  return { moi: !cu, botTat: !!cu?.bot_tat, soTinRa: count || 0 };
}

/** Tên + ảnh khách. Thiếu quyền thì BỎ QUA, không làm hỏng luồng nhận tin. */
export async function lamTuoiHoSo(pageId: string, psid: string): Promise<void> {
  const tok = await tokenCuaTrang(pageId);
  if (!tok) return;
  try {
    const r = await fetch(`${G}/${psid}?fields=name,profile_pic&access_token=${encodeURIComponent(tok)}`);
    const j: any = await r.json();
    if (j?.error || !j?.name) return;
    await getServiceClient().from("fb_contacts")
      .update({ ten: j.name, anh: j.profile_pic || null }).eq("page_id", pageId).eq("psid", psid);
  } catch { /* hồ sơ chỉ là trang trí, hỏng thì thôi */ }
}

/* ----------------------------------------------------------- ĐỌC HỘP THƯ */

export async function danhSachKhach(loc: "cho" | "tat-ca" = "tat-ca", gioiHan = 200): Promise<FbKhach[]> {
  const sb = getServiceClient();
  let q = sb.from("fb_contacts")
    .select("page_id,psid,ten,anh,sdt,sdt_norm,last_content,last_msg_at,last_in_at,unreplied,bot_tat,msg_count")
    .order("last_msg_at", { ascending: false, nullsFirst: false }).limit(gioiHan);
  if (loc === "cho") q = q.eq("unreplied", true);
  const { data } = await q;
  return (data || []).map((r: any) => ({
    pageId: r.page_id, psid: r.psid, ten: r.ten, anh: r.anh, sdt: r.sdt, sdtNorm: r.sdt_norm,
    lastContent: r.last_content, lastMsgAt: r.last_msg_at, lastInAt: r.last_in_at,
    unreplied: !!r.unreplied, botTat: !!r.bot_tat, msgCount: r.msg_count || 0,
  }));
}

export async function doanChat(pageId: string, psid: string, gioiHan = 60): Promise<FbTin[]> {
  const { data } = await getServiceClient().from("fb_messages")
    .select("mid,direction,content,boi,sent_at")
    .eq("page_id", pageId).eq("psid", psid)
    .order("sent_at", { ascending: false }).limit(gioiHan);
  return (data || []).reverse().map((r: any) => ({
    mid: r.mid, direction: r.direction, content: r.content, boi: r.boi, sentAt: r.sent_at,
  }));
}

/** Gắn SĐT cho khách Facebook — đây là lúc hội thoại nối được sang lịch hẹn và đơn hàng. */
export async function ganSdt(pageId: string, psid: string, sdt: string): Promise<{ ok: boolean; loi?: string }> {
  const norm = chuanSdt(sdt);
  if (!norm) return { ok: false, loi: "Số điện thoại chưa đúng" };
  const { error } = await getServiceClient().from("fb_contacts")
    .update({ sdt: sdt.trim(), sdt_norm: norm, updated_at: new Date().toISOString() })
    .eq("page_id", pageId).eq("psid", psid);
  return error ? { ok: false, loi: error.message } : { ok: true };
}

export async function datBotTat(pageId: string, psid: string, tat: boolean): Promise<void> {
  await getServiceClient().from("fb_contacts").update({ bot_tat: tat }).eq("page_id", pageId).eq("psid", psid);
}
