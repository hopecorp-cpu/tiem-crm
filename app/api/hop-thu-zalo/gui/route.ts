import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { nickChoPhep } from "@/lib/hop-thu-zalo-server";
import { timTuCam } from "@/lib/tu-cam";

export const dynamic = "force-dynamic";

/**
 * GỬI TIN CHO KHÁCH TỪ APP.
 *
 * Server web KHÔNG với tới Zalo. Tin đi hai bước:
 *   1. Route này GÁC (đăng nhập · đúng nick của mình · CỬA TỪ CẤM) rồi ghi vào kho
 *      `zalo_bridge_messages` với `msg_id = app-cho:<uuid>` (khung chat hiện ngay, gắn
 *      "đang gửi") + xếp vào config `zalo_gui_cho` (khoá = uuid).
 *   2. Cầu nối zca-js (`scripts/zalo-bridge.mjs --nick=…`) trên máy luôn bật poll hàng đợi,
 *      gửi thật bằng `api.sendMessage`, rồi đổi msg_id sang mã Zalo trả về
 *      (gửi hỏng → `app-loi:<uuid>`).
 *
 * CỬA TỪ CẤM Ở ĐÂY LÀ CHỐT — không có nút nào gửi ra Zalo mà không đi qua route này.
 * Câu dính từ cấm bị chặn 400 kèm danh sách từ, người sửa rồi gửi lại; KHÔNG tự thay từ hộ
 * (thay hộ là máy nói thay người).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const own = String(b.own || "").trim(), uid = String(b.uid || "").trim();
  const noiDung = String(b.noiDung || "").replace(/\s+$/g, "").trim();
  if (!own || !uid) return NextResponse.json({ loi: "Thiếu own/uid" }, { status: 400 });
  if (!noiDung) return NextResponse.json({ loi: "Tin trống" }, { status: 400 });
  if (noiDung.length > 2000) return NextResponse.json({ loi: "Tin quá dài (trên 2000 ký tự)" }, { status: 400 });

  const duocXem = await nickChoPhep(user);
  if (duocXem !== null && !duocXem.includes(own)) {
    return NextResponse.json({ loi: "Không có quyền gửi từ nick này" }, { status: 403 });
  }

  const tuCam = await timTuCam(noiDung);
  if (tuCam.length) {
    return NextResponse.json({
      loi: `Tin có từ trong danh sách cấm: ${tuCam.join(", ")}. Sửa lại rồi gửi.`,
      tuCam,
    }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data: kh } = await sb.from("zalo_bridge_contacts").select("thread_type").eq("own_id", own).eq("zalo_uid", uid).maybeSingle();
  if (!kh) return NextResponse.json({ loi: "Không thấy hội thoại trong kho" }, { status: 404 });

  const id = randomUUID();
  const luc = new Date().toISOString();
  const { error: e1 } = await sb.from("zalo_bridge_messages").insert({
    msg_id: `app-cho:${id}`, own_id: own, thread_id: uid, thread_type: kh.thread_type || "user",
    direction: "out", content: noiDung, sent_at: luc,
  });
  if (e1) return NextResponse.json({ loi: e1.message }, { status: 500 });

  // Kho hội thoại: mình vừa nói câu cuối → hết "đang chờ".
  await sb.from("zalo_bridge_contacts").update({ last_out_at: luc, last_msg_at: luc, unreplied: false, last_content: noiDung, last_type: "text", updated_at: luc })
    .eq("own_id", own).eq("zalo_uid", uid);

  try {
    const { data: cfg } = await sb.from("config").select("value").eq("key", "zalo_gui_cho").maybeSingle();
    const hang: Record<string, any> = (() => { try { return JSON.parse(cfg?.value || "{}"); } catch { return {}; } })();
    hang[id] = { own, uid, kieu: kh.thread_type || "user", noiDung, boi: user.ho_ten || user.email, luc };
    await sb.from("config").upsert({ key: "zalo_gui_cho", value: JSON.stringify(hang) }, { onConflict: "key" });
  } catch (e: any) {
    // Không xếp được hàng đợi thì đừng để tin nằm "đang gửi" mãi — đánh dấu lỗi ngay.
    await sb.from("zalo_bridge_messages").update({ msg_id: `app-loi:${id}` }).eq("msg_id", `app-cho:${id}`);
    return NextResponse.json({ loi: "Không xếp được vào hàng đợi gửi: " + String(e?.message || e) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: `app-cho:${id}`, luc });
}
