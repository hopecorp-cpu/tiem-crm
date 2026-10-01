import { NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { layTho, layDichVu, layCaiDat } from "@/lib/lich-server";
import { phutTu } from "@/lib/lich";

export const dynamic = "force-dynamic";

/**
 * DỊCH VỤ · THỢ · GIỜ MỞ CỬA — chỉ QUẢN LÝ sửa được.
 * Thợ và dịch vụ chỉ TẮT (active=false), không xoá: lịch cũ còn trỏ vào chúng,
 * xoá là mất lịch sử và gãy báo cáo.
 */
async function gacQuanLy() {
  const user = await getCurrentUser();
  if (!user) return { loi: "Chưa đăng nhập", ma: 401 };
  if (!laQuanLy(user.vai_tro)) return { loi: "Chỉ quản lý sửa được dịch vụ và thợ", ma: 403 };
  return null;
}

export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const [tho, dichVu, caiDat] = await Promise.all([layTho(), layDichVu(), layCaiDat()]);
  return NextResponse.json({ tho, dichVu, caiDat });
}

export async function POST(req: Request) {
  const chan = await gacQuanLy();
  if (chan) return NextResponse.json({ loi: chan.loi }, { status: chan.ma });
  const b = await req.json().catch(() => ({}));
  const sb = getServiceClient();

  if (b.loai === "tho") {
    const ten = String(b.ten || "").trim();
    if (!b.id && !ten) return NextResponse.json({ loi: "Chưa nhập tên thợ" }, { status: 400 });
    const hang: any = { updated: undefined };
    delete hang.updated;
    if (ten) hang.ten = ten;
    if (b.mau) hang.mau = String(b.mau);
    if (b.active !== undefined) hang.active = !!b.active;
    if (b.thuTu !== undefined) hang.thu_tu = Number(b.thuTu) || 0;
    const { error } = b.id
      ? await sb.from("tho").update(hang).eq("id", String(b.id))
      : await sb.from("tho").insert(hang);
    return error ? NextResponse.json({ loi: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }

  if (b.loai === "dich-vu") {
    const ten = String(b.ten || "").trim();
    if (!b.id && !ten) return NextResponse.json({ loi: "Chưa nhập tên dịch vụ" }, { status: 400 });
    const hang: any = {};
    if (ten) hang.ten = ten;
    if (b.phut !== undefined) {
      const p = Number(b.phut);
      if (!Number.isFinite(p) || p <= 0 || p > 600) return NextResponse.json({ loi: "Thời lượng phải từ 1 đến 600 phút" }, { status: 400 });
      hang.phut = Math.round(p);
    }
    if (b.gia !== undefined) {
      const g = Number(b.gia);
      if (!Number.isFinite(g) || g < 0) return NextResponse.json({ loi: "Giá không hợp lệ" }, { status: 400 });
      hang.gia = g;
    }
    if (b.active !== undefined) hang.active = !!b.active;
    if (b.thuTu !== undefined) hang.thu_tu = Number(b.thuTu) || 0;
    const { error } = b.id
      ? await sb.from("dich_vu").update(hang).eq("id", String(b.id))
      : await sb.from("dich_vu").insert(hang);
    return error ? NextResponse.json({ loi: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }

  if (b.loai === "cai-dat") {
    // Giờ mở phải TRƯỚC giờ đóng — không kiểm thì lịch ra bảng rỗng mà không ai hiểu vì sao.
    const mo = phutTu(b.gioMo), dong = phutTu(b.gioDong);
    if (mo == null || dong == null) return NextResponse.json({ loi: "Giờ phải dạng HH:MM" }, { status: 400 });
    if (dong <= mo) return NextResponse.json({ loi: "Giờ đóng cửa phải sau giờ mở cửa" }, { status: 400 });
    const buoc = Number(b.buoc);
    if (!Number.isFinite(buoc) || buoc < 5 || buoc > 120) return NextResponse.json({ loi: "Bước chia giờ nên từ 5 đến 120 phút" }, { status: 400 });
    const rows = [
      { key: "lich_gio_mo", value: String(b.gioMo) },
      { key: "lich_gio_dong", value: String(b.gioDong) },
      { key: "lich_buoc", value: String(Math.round(buoc)) },
      { key: "lich_ten_tiem", value: String(b.tenTiem || "").trim() || "Tiệm của bạn" },
      { key: "lich_cho_dat_web", value: b.choDatWeb ? "1" : "0" },
      { key: "lich_toi_da_ngay", value: String(Math.max(1, Math.min(365, Number(b.toiDaNgay) || 30))) },
    ];
    const { error } = await sb.from("config").upsert(rows, { onConflict: "key" });
    return error ? NextResponse.json({ loi: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ loi: "Không rõ cần sửa gì" }, { status: 400 });
}
