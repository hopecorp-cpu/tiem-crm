import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { chuKyDung, nhanTin, lamTuoiHoSo, guiTin } from "@/lib/facebook-server";
import { traLoi } from "@/lib/bot";

export const dynamic = "force-dynamic";

/**
 * WEBHOOK FACEBOOK — địa chỉ CÔNG KHAI, Meta gọi vào.
 * Khai ở Meta: Webhooks -> Callback URL = https://<tên miền>/api/fb/webhook
 *
 * GET  = Meta kiểm địa chỉ một lần lúc khai (so `hub.verify_token` với config `fb_verify_token`).
 * POST = tin mới. BẮT BUỘC đúng chữ ký HMAC bằng App Secret, nếu không ai cũng bơm tin giả
 *        vào hộp thư của tiệm và kích bot trả lời thay mình.
 *
 * LUÔN TRẢ 200 cho POST đã qua chữ ký, kể cả khi bên trong xử lý hỏng: Meta thấy mã khác 200
 * là gửi lại nhiều lần rồi tự tắt webhook của trang. Hỏng thì ghi vào `fb_pages.loi_cuoi` để
 * màn hình báo đỏ — hỏng phải kêu, nhưng kêu đúng chỗ.
 */

export async function GET(req: Request) {
  const u = new URL(req.url);
  const { data } = await getServiceClient().from("config").select("value").eq("key", "fb_verify_token").maybeSingle();
  const mong = (data?.value || "").trim();
  if (mong && u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === mong) {
    return new Response(u.searchParams.get("hub.challenge") || "", { status: 200 });
  }
  return new Response("sai verify token", { status: 403 });
}

export async function POST(req: Request) {
  const appSecret = process.env.FB_APP_SECRET || "";
  const tho = await req.text();                       // phải đọc THÂN THÔ, chữ ký ký trên đúng chuỗi này
  if (!chuKyDung(tho, req.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ loi: "chữ ký sai" }, { status: 403 });
  }

  let body: any = {};
  try { body = JSON.parse(tho); } catch { return NextResponse.json({ ok: true }); }

  for (const entry of body?.entry || []) {
    const pageId = String(entry?.id || "");
    for (const m of entry?.messaging || []) {
      try { await motTin(pageId, m); } catch { /* một tin hỏng không được làm rụng cả lô */ }
    }
  }
  return NextResponse.json({ ok: true });
}

async function motTin(pageId: string, m: any) {
  // Tin do CHÍNH TRANG gửi ra cũng vọng về đây. Không bỏ thì bot tự nói chuyện với nó vô tận.
  if (m?.message?.is_echo) return;
  const psid = String(m?.sender?.id || "");
  const noiDung = String(m?.message?.text || "").trim();
  const mid = String(m?.message?.mid || "");
  if (!pageId || !psid || !mid || !noiDung) return;   // ảnh/sticker: chưa xử lý, để người đọc

  const luc = new Date(Number(m.timestamp) || Date.now()).toISOString();
  const { moi, botTat, soTinRa } = await nhanTin(pageId, psid, mid, noiDung, luc);
  if (moi) await lamTuoiHoSo(pageId, psid);

  const sb = getServiceClient();
  const { data: kh } = await sb.from("fb_contacts").select("sdt,ten,last_out_at").eq("page_id", pageId).eq("psid", psid).maybeSingle();

  const kq = await traLoi({
    kenh: "facebook", tin: noiDung, sdt: kh?.sdt, tenKhach: kh?.ten,
    soLuotBotDaNoi: soTinRa, botTat, dapGanNhat: kh?.last_out_at,
  });
  if (kq.tra) await guiTin(pageId, psid, kq.tra, "bot");
}
