import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { layCaiDat, layDichVu, datLich, choTrongTheoTho } from "@/lib/lich-server";
import { chuanSdt, vnDateStr, congNgay } from "@/lib/chung";

export const dynamic = "force-dynamic";

/**
 * CỬA CÔNG KHAI — khách tự đặt lịch, KHÔNG đăng nhập.
 * Đường dẫn cố ý có chữ "cong-khai" để ai rà bảo mật nhìn một cái là biết chỗ nào hở.
 *
 * SÁU CHỐT, vì đây là cửa duy nhất người lạ gõ vào được:
 *  1. CHỈ trả về giờ TRỐNG + tên thợ + bảng dịch vụ. KHÔNG bao giờ trả tên hay số của
 *     khách khác — lịch của tiệm là danh sách phụ nữ kèm giờ họ có mặt ở một địa chỉ,
 *     rò ra là chuyện an toàn cá nhân chứ không chỉ là lộ dữ liệu.
 *  2. Thời lượng và GIÁ lấy từ CSDL theo id dịch vụ, không nhận số từ trình duyệt.
 *  3. Chỉ đặt được từ hôm nay tới `lich_toi_da_ngay` ngày sau.
 *  4. Bắt buộc có SĐT, và một SĐT giữ tối đa 3 hẹn đang chờ + 5 lượt đặt trong 1 giờ.
 *  5. Bẫy máy (honeypot): ô ẩn `website` có chữ -> coi như đã nhận rồi lặng lẽ bỏ.
 *  6. Chủ tiệm tắt được hẳn đường này bằng config `lich_cho_dat_web` = 0.
 */

const TOI_DA_CHO = 3;      // hẹn đang chờ tối đa / một SĐT
const TOI_DA_1_GIO = 5;    // lượt đặt tối đa trong 1 giờ / một SĐT

export async function GET(req: Request) {
  const caiDat = await layCaiDat();
  if (!caiDat.choDatWeb) return NextResponse.json({ loi: "Tiệm đang tạm không nhận đặt lịch qua web" }, { status: 403 });

  const u = new URL(req.url);
  const ngay = u.searchParams.get("ngay") || vnDateStr();
  const dichVuId = u.searchParams.get("dichVu") || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return NextResponse.json({ loi: "Ngày không hợp lệ" }, { status: 400 });
  if (ngay < vnDateStr() || ngay > congNgay(vnDateStr(), caiDat.toiDaNgay)) {
    return NextResponse.json({ loi: "Ngoài khoảng ngày nhận đặt" }, { status: 400 });
  }

  const dichVu = await layDichVu(true);
  // Chưa chọn dịch vụ thì chưa biết cần bao nhiêu phút -> chưa trả giờ, tránh vẽ chỗ trống sai.
  const cho = dichVuId ? await choTrongTheoTho(ngay, dichVuId) : [];
  return NextResponse.json({
    tenTiem: caiDat.tenTiem,
    toiDaNgay: caiDat.toiDaNgay,
    dichVu: dichVu.map((d) => ({ id: d.id, ten: d.ten, phut: d.phut, gia: d.gia })),
    cho,
  });
}

export async function POST(req: Request) {
  const caiDat = await layCaiDat();
  if (!caiDat.choDatWeb) return NextResponse.json({ loi: "Tiệm đang tạm không nhận đặt lịch qua web" }, { status: 403 });

  const b = await req.json().catch(() => ({}));

  // Chốt 5 — bẫy máy. Người thật không thấy ô này nên không bao giờ điền.
  if (String(b.website || "").trim()) return NextResponse.json({ ok: true, id: "bo-qua" });

  const sdt = chuanSdt(b.sdt);
  if (!sdt) return NextResponse.json({ loi: "Số điện thoại chưa đúng" }, { status: 400 });
  const ten = String(b.khachTen || "").trim();
  if (ten.length < 2 || ten.length > 60) return NextResponse.json({ loi: "Tên khách chưa hợp lệ" }, { status: 400 });

  const ngay = String(b.ngay || "");
  if (ngay < vnDateStr() || ngay > congNgay(vnDateStr(), caiDat.toiDaNgay)) {
    return NextResponse.json({ loi: "Ngoài khoảng ngày nhận đặt" }, { status: 400 });
  }
  if (!b.dichVuId) return NextResponse.json({ loi: "Chưa chọn dịch vụ" }, { status: 400 });

  // Chốt 4 — chặn người rảnh ngồi đặt hàng chục lịch ma làm kín sổ của tiệm.
  const sb = getServiceClient();
  const [{ count: dangCho }, { count: vuaDat }] = await Promise.all([
    sb.from("lich_hen").select("id", { count: "exact", head: true })
      .eq("sdt_norm", sdt).eq("trang_thai", "dat").gte("ngay", vnDateStr()),
    sb.from("lich_hen").select("id", { count: "exact", head: true })
      .eq("sdt_norm", sdt).gte("created_at", new Date(Date.now() - 3600e3).toISOString()),
  ]);
  if ((dangCho || 0) >= TOI_DA_CHO) {
    return NextResponse.json({ loi: `Số này đang có ${dangCho} lịch chờ rồi. Gọi tiệm giúp em nếu cần đặt thêm nhé.` }, { status: 429 });
  }
  if ((vuaDat || 0) >= TOI_DA_1_GIO) {
    return NextResponse.json({ loi: "Bạn vừa đặt khá nhiều lượt, thử lại sau một lát nhé." }, { status: 429 });
  }

  const kq = await datLich({
    ngay, phutBd: Number(b.phutBd), thoId: String(b.thoId || ""),
    dichVuId: String(b.dichVuId), khachTen: ten, sdt: String(b.sdt || ""),
    ghiChu: String(b.ghiChu || "").slice(0, 300) || null,
    nguon: "web",
  });
  return kq.ok ? NextResponse.json(kq) : NextResponse.json({ loi: kq.loi }, { status: 400 });
}
