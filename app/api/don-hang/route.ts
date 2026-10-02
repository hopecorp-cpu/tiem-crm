import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { themDon, suaDon, xoaDon, donTheoThang } from "@/lib/don-hang-server";
import { tachMon } from "@/lib/don-hang";

export const dynamic = "force-dynamic";

/**
 * Cửa đơn hàng cho người ĐÃ ĐĂNG NHẬP. Khác hẳn `/api/lich/cong-khai` (người lạ gõ được):
 * ở đây chặn ngay từ đầu bằng phiên đăng nhập, nên không cần bộ chốt chống lạm dụng.
 * Nhân viên vào được — ai bán cũng phải ghi đơn được, chặn ở đây thì họ ghi ra giấy.
 */
async function canhCua() {
  const user = await getCurrentUser();
  return user ? null : NextResponse.json({ ok: false, loi: "Chưa đăng nhập" }, { status: 401 });
}

export async function GET(req: Request) {
  const chan = await canhCua(); if (chan) return chan;
  const thang = new URL(req.url).searchParams.get("thang") || "";
  try {
    return NextResponse.json({ ok: true, don: await donTheoThang(thang) });
  } catch (e: any) {
    // Hỏng thì nói hỏng — KHÔNG trả danh sách rỗng kèm 200, vì màn hình sẽ hiện
    // "chưa có đơn nào" và chủ tiệm đọc thành hôm nay không bán được gì.
    return NextResponse.json({ ok: false, loi: e?.message || "Không đọc được kho đơn" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const chan = await canhCua(); if (chan) return chan;
  const b = await req.json().catch(() => ({}));
  const kq = await themDon({
    sdt: String(b.sdt || ""), khach: b.khach, khachTra: b.khachTra,
    ngay: b.ngay, sanPham: tachMon(String(b.sanPham || "")),
    sale: b.sale, ghiChu: b.ghiChu,
  });
  return NextResponse.json(kq, { status: kq.ok ? 200 : 400 });
}

export async function PATCH(req: Request) {
  const chan = await canhCua(); if (chan) return chan;
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, loi: "Thiếu id" }, { status: 400 });
  const v: any = {};
  for (const k of ["sdt", "khach", "ngay", "sale", "ghiChu"]) if (b[k] !== undefined) v[k] = b[k];
  if (b.khachTra !== undefined) v.khachTra = b.khachTra;
  if (b.sanPham !== undefined) v.sanPham = tachMon(String(b.sanPham || ""));
  const kq = await suaDon(String(b.id), v);
  return NextResponse.json(kq, { status: kq.ok ? 200 : 400 });
}

export async function DELETE(req: Request) {
  const chan = await canhCua(); if (chan) return chan;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ ok: false, loi: "Thiếu id" }, { status: 400 });
  const kq = await xoaDon(id);
  return NextResponse.json(kq, { status: kq.ok ? 200 : 400 });
}
