import { NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { chuanSdt, vnDateStr } from "@/lib/hop-thu-zalo";
import { nickChoPhep } from "@/lib/hop-thu-zalo-server";

export const dynamic = "force-dynamic";

/**
 * HÀNH ĐỘNG NHANH của hộp thư — ghi THẬT vào hệ thống, không phải nút dẫn sang trang khác.
 *
 * Hai việc, cố ý chỉ hai:
 *   tao-viec  → chèn vào `cong_viec`
 *   ghi-cham  → chèn vào `cham_soc` (dòng thời gian chăm sóc của khách)
 *
 * CỐ Ý KHÔNG CÓ "giao cho nhân viên khác": khách nhắn vào Zalo của ai thì chính người đó
 * chăm — đồng nghiệp không mở được Zalo của nhau, "chuyền" khách sang chỉ làm khách rơi
 * vào khoảng không.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const viec = String(b.viec || "");
  const own = String(b.own || "").trim();

  // Gác bằng ĐÚNG hàm của trang: không cho ghi chú vào hội thoại mình không được xem.
  const duocXem = await nickChoPhep(user);
  if (own && duocXem !== null && !duocXem.includes(own)) {
    return NextResponse.json({ loi: "Không có quyền thao tác trên hộp thư này" }, { status: 403 });
  }

  const sb = getServiceClient();
  const ten = String(b.ten || "").trim() || "khách Zalo";
  const phone = String(b.phone || "").trim();

  try {
    if (viec === "tao-viec") {
      const tieuDe = String(b.tieuDe || "").trim();
      if (!tieuDe) return NextResponse.json({ loi: "Thiếu tiêu đề việc" }, { status: 400 });
      const han = String(b.han || "").trim() || vnDateStr();   // giao là làm NGAY, mặc định hôm nay
      const { error } = await sb.from("cong_viec").insert({
        title: tieuDe,
        description: [
          `Khách: ${ten}`,
          phone ? `SĐT: ${phone}` : "",
          // Đường quay lại đúng hội thoại — để dán thẳng vào tin nhắc việc.
          own && b.uid ? `Hội thoại: /zalo/tin-nhan?hoi-thoai=${own}|${b.uid}` : "",
          b.ghiChu || "",
        ].filter(Boolean).join("\n"),
        assignee_id: user.id,
        priority: b.gap ? "urgent" : "medium",
        status: "todo",
        due_date: han,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, han });
    }

    if (viec === "ghi-cham") {
      if (!phone) return NextResponse.json({ loi: "Khách chưa có số điện thoại nên chưa ghi được lượt chăm" }, { status: 400 });
      const kieu = ["call", "message", "gift"].includes(String(b.kieu)) ? String(b.kieu) : "message";
      const { error } = await sb.from("cham_soc").insert({
        customer_phone: chuanSdt(phone) || phone,
        customer_name: ten,
        sale_name: b.sale || user.ho_ten || null,
        kind: kieu,
        channel: "zalo",
        content: String(b.ghiChu || "").trim() || null,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ loi: "Việc không hợp lệ" }, { status: 400 });
  } catch (e: any) {
    // Hỏng KHÔNG trả 200: trả 200 thì màn hình báo "đã ghi" trong khi không có gì được ghi,
    // và người ta yên tâm bỏ đi.
    return NextResponse.json({ loi: String(e?.message || e) }, { status: 500 });
  }
}
