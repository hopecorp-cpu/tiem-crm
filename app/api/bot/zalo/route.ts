import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { traLoi } from "@/lib/bot";

export const dynamic = "force-dynamic";

/**
 * BOT TRẢ LỜI BÊN ZALO.
 *
 * Zalo khác Facebook: server web không với tới Zalo, nên không có webhook để bot
 * đáp tức thì. Đường duy nhất là QUÉT kho hội thoại rồi xếp câu trả lời vào đúng
 * hàng đợi mà cầu nối đang poll (`config.zalo_gui_cho`) — y hệt đường tin người gõ,
 * nên nó cũng đi qua mọi chốt của đường đó.
 *
 * Gọi định kỳ: đặt một việc theo giờ trên máy chạy cầu nối, ví dụ mỗi 2 phút
 *   curl -s -X POST https://<tên miền>/api/bot/zalo -H "x-bot-key: $BOT_QUET_KEY"
 *
 * BA CHỐT:
 *  - chỉ đụng hội thoại 1-1 (`thread_type=user`), KHÔNG đụng nhóm — bot nhảy vào
 *    nhóm cộng đồng trả lời là mất mặt tiệm ngay;
 *  - chỉ hội thoại khách nói câu cuối (`unreplied`) và tin đó dưới 30 phút — tồn
 *    đọng ba hôm trước mà bot bỗng dưng trả lời thì khách thấy kỳ;
 *  - trần 20 hội thoại một lượt, để lỡ có sai thì sai ít.
 */
const TRAN = 20;
const TRE_TOI_DA_PHUT = 30;

export async function POST(req: Request) {
  // Hai lối vào: nhân viên bấm thử trong app, hoặc máy gọi bằng khoá.
  const khoa = (process.env.BOT_QUET_KEY || "").trim();
  const tuMay = !!khoa && req.headers.get("x-bot-key") === khoa;
  if (!tuMay && !(await getCurrentUser())) {
    return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  }

  const sb = getServiceClient();
  const moc = new Date(Date.now() - TRE_TOI_DA_PHUT * 60000).toISOString();
  const { data: cho } = await sb.from("zalo_bridge_contacts")
    .select("own_id,zalo_uid,display_name,phone,last_in_at,last_out_at,last_content,thread_type")
    .eq("unreplied", true).eq("thread_type", "user")
    .gte("last_in_at", moc).order("last_in_at", { ascending: false }).limit(TRAN);

  const daDap: Array<{ uid: string; yDinh: string }> = [];
  const boQua: Array<{ uid: string; lyDo: string }> = [];

  for (const k of cho || []) {
    const kq = await traLoi({
      kenh: "zalo", tin: k.last_content || "", sdt: k.phone, tenKhach: k.display_name,
      dapGanNhat: k.last_out_at,
    });
    if (!kq.tra) { boQua.push({ uid: k.zalo_uid, lyDo: kq.lyDo }); continue; }

    // Xếp vào ĐÚNG hàng đợi của cầu nối — không có đường tắt nào khác ra Zalo.
    const id = randomUUID();
    const luc = new Date().toISOString();
    await sb.from("zalo_bridge_messages").insert({
      msg_id: `app-cho:${id}`, own_id: k.own_id, thread_id: k.zalo_uid, thread_type: "user",
      direction: "out", content: kq.tra, sent_at: luc,
    });
    await sb.from("zalo_bridge_contacts").update({
      last_out_at: luc, last_msg_at: luc, unreplied: false, last_content: kq.tra, last_type: "text", updated_at: luc,
    }).eq("own_id", k.own_id).eq("zalo_uid", k.zalo_uid);

    const { data: cfg } = await sb.from("config").select("value").eq("key", "zalo_gui_cho").maybeSingle();
    const hang: Record<string, any> = (() => { try { return JSON.parse(cfg?.value || "{}"); } catch { return {}; } })();
    hang[id] = { own: k.own_id, uid: k.zalo_uid, kieu: "user", noiDung: kq.tra, boi: "bot", luc };
    await sb.from("config").upsert({ key: "zalo_gui_cho", value: JSON.stringify(hang) }, { onConflict: "key" });

    daDap.push({ uid: k.zalo_uid, yDinh: kq.yDinh });
  }

  return NextResponse.json({ ok: true, soi: (cho || []).length, daDap, boQua });
}
