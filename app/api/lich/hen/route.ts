import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import {
  lichTheoNgay, datLich, doiTrangThai, xongTaoDon, canNhac, danhDauDaNhac,
} from "@/lib/lich-server";
import type { TrangThai } from "@/lib/lich";

export const dynamic = "force-dynamic";

/**
 * LỊCH HẸN — phía TRONG TIỆM (bắt buộc đăng nhập).
 * Trang khách tự đặt đi cửa khác: /api/lich/cong-khai.
 *
 * GET  ?ngay=YYYY-MM-DD        -> lịch của ngày
 * GET  ?canNhac=1              -> hẹn ngày mai chưa nhắc
 * POST {ngay,phutBd,thoId,...} -> đặt lịch
 * PATCH {id, trangThai}        -> đổi trạng thái
 * PATCH {id, xong:true}        -> đánh dấu đến XONG + sinh đơn hàng
 * PATCH {daNhac:[id,...]}      -> ghi nhận đã nhắc khách
 */
const CHO_PHEP: TrangThai[] = ["dat", "den", "vang", "huy"];

export async function GET(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const u = new URL(req.url);
  if (u.searchParams.get("canNhac")) return NextResponse.json({ hen: await canNhac() });
  const ngay = u.searchParams.get("ngay") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return NextResponse.json({ loi: "Thiếu ngày" }, { status: 400 });
  return NextResponse.json({ hen: await lichTheoNgay(ngay) });
}

export async function POST(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const kq = await datLich({
    ngay: String(b.ngay || ""), phutBd: Number(b.phutBd), thoId: String(b.thoId || ""),
    dichVuId: b.dichVuId || null, khachTen: String(b.khachTen || ""),
    sdt: b.sdt || null, ghiChu: b.ghiChu || null, nguon: "tiem",
  });
  return kq.ok ? NextResponse.json(kq) : NextResponse.json({ loi: kq.loi }, { status: 400 });
}

export async function PATCH(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const b = await req.json().catch(() => ({}));

  if (Array.isArray(b.daNhac)) {
    await danhDauDaNhac(b.daNhac.map(String).slice(0, 200));
    return NextResponse.json({ ok: true });
  }
  const id = String(b.id || "");
  if (!id) return NextResponse.json({ loi: "Thiếu id" }, { status: 400 });

  if (b.xong) {
    const kq = await xongTaoDon(id);
    return kq.ok ? NextResponse.json(kq) : NextResponse.json({ loi: kq.loi }, { status: 400 });
  }
  const tt = String(b.trangThai || "") as TrangThai;
  if (!CHO_PHEP.includes(tt)) return NextResponse.json({ loi: "Trạng thái lạ" }, { status: 400 });
  const kq = await doiTrangThai(id, tt);
  return kq.ok ? NextResponse.json(kq) : NextResponse.json({ loi: kq.loi }, { status: 400 });
}
