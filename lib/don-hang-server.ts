import "server-only";
import { getServiceClient } from "@/lib/supabase-server";
import { chuanSdt } from "@/lib/chung";
import { docTien, docSanPham, khoangThang, type DonHang } from "@/lib/don-hang";

const COT = "id,sdt,sdt_norm,khach,khach_tra,ngay,san_pham,sale,ghi_chu,created_at";

export type KetQua = { ok: true; id: string } | { ok: false; loi: string };

function doDon(r: any, idTuLich: Set<string>): DonHang {
  return {
    id: r.id,
    sdt: r.sdt || "",
    sdtNorm: r.sdt_norm ?? chuanSdt(r.sdt),
    khach: r.khach ?? null,
    khachTra: Number(r.khach_tra) || 0,
    ngay: r.ngay ?? null,
    sanPham: docSanPham(r.san_pham),
    sale: r.sale ?? null,
    ghiChu: r.ghi_chu ?? null,
    tuLich: idTuLich.has(r.id),
    taoLuc: r.created_at ?? null,
  };
}

/**
 * Đơn nào do màn Lịch hẹn sinh ra. Hỏi NGƯỢC từ bảng lịch (`lich_hen.don_hang_id`)
 * thay vì thêm một cột cờ vào `don_hang`: liên kết đã tồn tại sẵn một chiều, dựng thêm
 * cờ thứ hai là có hai nguồn sự thật rồi chờ chúng lệch nhau.
 * Bảng lịch có thể CHƯA tồn tại (chủ tiệm chỉ chạy 001+005) — lỗi thì coi như không có đơn nào từ lịch.
 */
async function idTuLich(): Promise<Set<string>> {
  const sb = getServiceClient();
  try {
    const { data, error } = await sb.from("lich_hen").select("don_hang_id").not("don_hang_id", "is", null);
    if (error) return new Set();
    return new Set((data || []).map((r: any) => r.don_hang_id).filter(Boolean));
  } catch { return new Set(); }
}

/**
 * Đơn trong MỘT THÁNG. Lọc theo cột `ngay`; đơn chưa điền ngày thì xếp vào tháng tạo
 * để không biến mất khỏi mọi màn hình (đơn vô hình là đơn không ai đi đòi tiền).
 */
export async function donTheoThang(thang: string): Promise<DonHang[]> {
  const k = khoangThang(thang);
  if (!k) return [];
  const sb = getServiceClient();
  const tuLich = await idTuLich();

  // CỐ Ý hai truy vấn thẳng thay vì một câu `.or(and(...),and(...))`: cú pháp lọc lồng
  // của PostgREST coi dấu phẩy và hai chấm là ký tự đặc biệt, nên mốc thời gian nhét vào
  // trong đó hỏng ÂM THẦM — trả ít dòng hơn thật mà không báo lỗi. Hai câu đơn thì đọc
  // được bằng mắt và sai thì sai to, thấy ngay.
  async function lat(dung: (q: any) => any): Promise<any[]> {
    let rows: any[] = [], off = 0;
    while (true) {
      // PostgREST chặn cứng 1000 dòng/lần và KHÔNG báo lỗi khi cắt — phải lật trang.
      const { data, error } = await dung(sb.from("don_hang").select(COT)).range(off, off + 999);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      rows = rows.concat(data);
      if (data.length < 1000) break;
      off += 1000;
    }
    return rows;
  }

  const [theoNgay, chuaCoNgay] = await Promise.all([
    lat((q: any) => q.gte("ngay", k.tu).lte("ngay", k.den).order("ngay", { ascending: false })),
    // Đơn quên điền ngày thì xếp theo NGÀY TẠO, để nó không biến mất khỏi mọi màn hình —
    // đơn vô hình là đơn không ai đi đòi tiền.
    lat((q: any) => q.is("ngay", null)
      .gte("created_at", `${k.tu}T00:00:00`).lte("created_at", `${k.den}T23:59:59.999`)
      .order("created_at", { ascending: false })),
  ]);

  return [...theoNgay, ...chuaCoNgay].map((r) => doDon(r, tuLich));
}

export async function donCuaKhach(sdt: string, gioiHan = 20): Promise<DonHang[]> {
  const p = chuanSdt(sdt);
  if (!p) return [];
  const sb = getServiceClient();
  const tuLich = await idTuLich();
  const tho = p.replace(/^84/, "0");
  const { data } = await sb.from("don_hang").select(COT)
    .or(`sdt_norm.eq.${p},sdt.eq.${p},sdt.eq.${tho}`)
    .order("ngay", { ascending: false }).limit(gioiHan);
  return (data || []).map((r) => doDon(r, tuLich));
}

type NhapDon = {
  sdt: string; khach?: string; khachTra: unknown; ngay?: string;
  sanPham?: string[]; sale?: string; ghiChu?: string;
};

/** Ghi đơn gõ tay. Số tiền đọc ở ĐÂY, không tin con số trình duyệt gửi lên. */
export async function themDon(d: NhapDon): Promise<KetQua> {
  const p = chuanSdt(d.sdt);
  if (!p) return { ok: false, loi: "Số điện thoại không hợp lệ" };
  const tien = docTien(d.khachTra);
  if (tien === null) return { ok: false, loi: "Số tiền không đọc được" };

  const sb = getServiceClient();
  const { data, error } = await sb.from("don_hang").insert({
    sdt: p, sdt_norm: p, khach: d.khach?.trim() || null, khach_tra: tien,
    ngay: d.ngay || null, san_pham: d.sanPham || [],
    sale: d.sale?.trim() || null, ghi_chu: d.ghiChu?.trim() || null,
  }).select("id").single();
  if (error) return { ok: false, loi: error.message };
  return { ok: true, id: data!.id };
}

export async function suaDon(id: string, d: Partial<NhapDon>): Promise<KetQua> {
  const sb = getServiceClient();
  const v: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (d.sdt !== undefined) {
    const p = chuanSdt(d.sdt);
    if (!p) return { ok: false, loi: "Số điện thoại không hợp lệ" };
    v.sdt = p; v.sdt_norm = p;
  }
  if (d.khachTra !== undefined) {
    const tien = docTien(d.khachTra);
    if (tien === null) return { ok: false, loi: "Số tiền không đọc được" };
    v.khach_tra = tien;
  }
  if (d.khach !== undefined)    v.khach = d.khach.trim() || null;
  if (d.ngay !== undefined)     v.ngay = d.ngay || null;
  if (d.sanPham !== undefined)  v.san_pham = d.sanPham;
  if (d.sale !== undefined)     v.sale = d.sale.trim() || null;
  if (d.ghiChu !== undefined)   v.ghi_chu = d.ghiChu.trim() || null;

  const { error } = await sb.from("don_hang").update(v).eq("id", id);
  if (error) return { ok: false, loi: error.message };
  return { ok: true, id };
}

/**
 * Xoá đơn. Đơn do LỊCH sinh ra thì từ chối — xoá nó xong lịch vẫn giữ `don_hang_id`
 * trỏ vào khoảng không, và bấm "xong" lần nữa cũng không sinh lại được (chốt chống
 * bấm hai lần đọc đúng cái id đã chết đó). Sửa sai bằng cách sửa đơn, không bằng xoá.
 */
export async function xoaDon(id: string): Promise<KetQua> {
  const sb = getServiceClient();
  if ((await idTuLich()).has(id)) {
    return { ok: false, loi: "Đơn này sinh từ một lịch hẹn — sửa nội dung đơn, đừng xoá. Muốn bỏ hẳn thì huỷ lịch hẹn đó." };
  }
  const { error } = await sb.from("don_hang").delete().eq("id", id);
  if (error) return { ok: false, loi: error.message };
  return { ok: true, id };
}

/** Các tháng CÓ đơn, mới nhất trước — để ô chọn tháng không hiện tháng trống trơn. */
export async function cacThangCoDon(): Promise<string[]> {
  const sb = getServiceClient();
  const { data } = await sb.from("don_hang").select("ngay,created_at")
    .order("ngay", { ascending: false }).limit(5000);
  const t = new Set<string>();
  for (const r of data || []) {
    const n = (r as any).ngay || (r as any).created_at;
    if (n) t.add(String(n).slice(0, 7));
  }
  return [...t].sort().reverse();
}
