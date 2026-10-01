import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { layDoanChat, layHoSoKhach, layHoatDong, nickChoPhep } from "@/lib/hop-thu-zalo-server";

export const dynamic = "force-dynamic";

/**
 * Nạp một đoạn chat + hồ sơ khách khi người dùng bấm vào hội thoại.
 *
 * Cố ý KHÔNG nạp sẵn toàn bộ kho tin vào trang: nặng, và phần lớn không ai mở tới.
 * Gác quyền bằng đúng `nickChoPhep` mà trang dùng — nội dung chat là dữ liệu cá nhân của
 * khách, gác ở trang mà để hở route thì coi như không gác.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const own = (searchParams.get("own") || "").trim();
  const uid = (searchParams.get("uid") || "").trim();
  const phone = (searchParams.get("phone") || "").trim() || null;
  const ten = (searchParams.get("ten") || "").trim();
  if (!own || !uid) return NextResponse.json({ loi: "Thiếu own/uid" }, { status: 400 });

  const duocXem = await nickChoPhep(user);
  if (duocXem !== null && !duocXem.includes(own)) {
    return NextResponse.json({ loi: "Không có quyền xem hộp thư này" }, { status: 403 });
  }

  try {
    const [tin, hoSo, hoatDong] = await Promise.all([
      layDoanChat(own, uid),
      layHoSoKhach(phone, ten),
      layHoatDong(phone),
    ]);
    return NextResponse.json({ tin, hoSo, hoatDong });
  } catch (e: any) {
    // Route hỏng KHÔNG trả 200 — nếu không thì màn hình vẽ đoạn chat rỗng và người đọc
    // hiểu thành "khách chưa nhắn gì".
    return NextResponse.json({ loi: String(e?.message || e) }, { status: 500 });
  }
}
