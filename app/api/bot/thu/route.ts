import { NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { traLoi } from "@/lib/bot";

export const dynamic = "force-dynamic";

/**
 * THỬ BOT + sửa cài đặt bot. Có màn thử để chủ tiệm gõ thử một câu rồi XEM NGAY
 * bot định trả lời gì — không phải đem khách thật ra làm chuột bạch.
 * Thử thì KHÔNG gửi đi đâu cả, chỉ hiện ra màn hình.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const b = await req.json().catch(() => ({}));

  if (b.luu) {
    if (!laQuanLy(user.vai_tro)) return NextResponse.json({ loi: "Chỉ quản lý sửa được cài đặt bot" }, { status: 403 });
    const rows = [
      { key: "bot_bat", value: b.bat ? "1" : "0" },
      { key: "bot_nguoi_sau", value: String(Math.max(1, Math.min(10, Number(b.nguoiSau) || 2))) },
      { key: "bot_nghi_phut", value: String(Math.max(0, Math.min(120, Number(b.nghiPhut) || 1))) },
      { key: "bot_dia_chi", value: String(b.diaChi || "").slice(0, 300) },
      { key: "bot_loi_chao", value: String(b.loiChao || "").slice(0, 600) },
      { key: "bot_tu_khoa_nguoi", value: String(b.tuKhoaNguoi || "").slice(0, 1000) },
    ];
    const { error } = await getServiceClient().from("config").upsert(rows, { onConflict: "key" });
    return error ? NextResponse.json({ loi: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }

  // Thử một câu — ép bật để xem bot ĐỊNH nói gì, kể cả khi đang tắt ngoài đời.
  const kq = await traLoi({
    kenh: b.kenh === "zalo" ? "zalo" : "facebook",
    tin: String(b.tin || ""), sdt: b.sdt || null, tenKhach: b.tenKhach || null, boQuaTat: true,
  });
  return NextResponse.json(kq);
}
