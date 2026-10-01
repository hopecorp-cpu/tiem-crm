import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { danhSachKhach, doanChat, guiTin, ganSdt, datBotTat } from "@/lib/facebook-server";
import { timTuCam } from "@/lib/tu-cam";

export const dynamic = "force-dynamic";

/**
 * HỘP THƯ FACEBOOK.
 * GET  ?loc=cho|tat-ca            -> danh sách hội thoại
 * GET  ?pageId=&psid=             -> đoạn chat
 * POST {pageId,psid,noiDung}      -> gửi tin (qua CỬA TỪ CẤM)
 * POST {pageId,psid,sdt}          -> gắn số điện thoại
 * POST {pageId,psid,botTat}       -> người vào tay / trả lại cho bot
 */
export async function GET(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const u = new URL(req.url);
  const pageId = u.searchParams.get("pageId"), psid = u.searchParams.get("psid");
  if (pageId && psid) return NextResponse.json({ tin: await doanChat(pageId, psid) });
  const loc = u.searchParams.get("loc") === "cho" ? "cho" : "tat-ca";
  return NextResponse.json({ khach: await danhSachKhach(loc) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const pageId = String(b.pageId || ""), psid = String(b.psid || "");
  if (!pageId || !psid) return NextResponse.json({ loi: "Thiếu trang hoặc khách" }, { status: 400 });

  if (b.sdt !== undefined) {
    const k = await ganSdt(pageId, psid, String(b.sdt));
    return k.ok ? NextResponse.json(k) : NextResponse.json({ loi: k.loi }, { status: 400 });
  }
  if (b.botTat !== undefined) {
    await datBotTat(pageId, psid, !!b.botTat);
    return NextResponse.json({ ok: true });
  }

  const noiDung = String(b.noiDung || "").trim();
  if (!noiDung) return NextResponse.json({ loi: "Tin trống" }, { status: 400 });
  if (noiDung.length > 1800) return NextResponse.json({ loi: "Tin quá dài (trên 1800 ký tự)" }, { status: 400 });

  // CỬA TỪ CẤM — y như bên Zalo. Không có nút nào ra khách mà không qua đây.
  const cam = await timTuCam(noiDung);
  if (cam.length) return NextResponse.json({ loi: `Tin có từ trong danh sách cấm: ${cam.join(", ")}. Sửa lại rồi gửi.`, tuCam: cam }, { status: 400 });

  // Nhân viên đã gõ tay thì BOT IM cho hội thoại này — hai bên cùng nói là khách rối.
  await datBotTat(pageId, psid, true);
  const k = await guiTin(pageId, psid, noiDung, user.ho_ten || user.email || "nhân viên");
  return k.ok ? NextResponse.json(k) : NextResponse.json({ loi: k.loi }, { status: 400 });
}
