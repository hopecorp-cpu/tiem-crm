import "server-only";
import { getServiceClient } from "@/lib/supabase-server";
import { chuanSdt, vnDateStr, congNgay } from "@/lib/chung";
import {
  CAI_DAT_MAC_DINH, phutTu, choTrong,
  type CaiDatLich, type DichVu, type LichHen, type Tho, type TrangThai,
} from "@/lib/lich";

const COT = "id,ngay,phut_bd,phut,tho_id,dich_vu_id,dich_vu_ten,gia,khach_ten,sdt,sdt_norm,ghi_chu,trang_thai,nguon,nhac_luc,don_hang_id";

function doHen(r: any): LichHen {
  return {
    id: r.id, ngay: r.ngay, phutBd: r.phut_bd, phut: r.phut,
    thoId: r.tho_id, dichVuId: r.dich_vu_id, dichVuTen: r.dich_vu_ten,
    gia: Number(r.gia || 0), khachTen: r.khach_ten, sdt: r.sdt, sdtNorm: r.sdt_norm,
    ghiChu: r.ghi_chu, trangThai: r.trang_thai as TrangThai, nguon: r.nguon || "tiem",
    nhacLuc: r.nhac_luc, donHangId: r.don_hang_id,
  };
}

/* ------------------------------------------------------------------ CÀI ĐẶT */

export async function layCaiDat(): Promise<CaiDatLich> {
  const sb = getServiceClient();
  const { data } = await sb.from("config").select("key,value")
    .in("key", ["lich_gio_mo", "lich_gio_dong", "lich_buoc", "lich_ten_tiem", "lich_cho_dat_web", "lich_toi_da_ngay"]);
  const m = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
  // Giá trị hỏng trong config KHÔNG được làm sập trang — rơi về mặc định.
  const soDuong = (v: any, md: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : md; };
  const mo = phutTu(m.lich_gio_mo) ?? CAI_DAT_MAC_DINH.gioMo;
  const dong = phutTu(m.lich_gio_dong) ?? CAI_DAT_MAC_DINH.gioDong;
  return {
    gioMo: mo,
    gioDong: dong > mo ? dong : CAI_DAT_MAC_DINH.gioDong,
    buoc: soDuong(m.lich_buoc, CAI_DAT_MAC_DINH.buoc),
    tenTiem: (m.lich_ten_tiem || "").trim() || CAI_DAT_MAC_DINH.tenTiem,
    choDatWeb: m.lich_cho_dat_web !== "0",
    toiDaNgay: soDuong(m.lich_toi_da_ngay, CAI_DAT_MAC_DINH.toiDaNgay),
  };
}

/* ------------------------------------------------------------ THỢ · DỊCH VỤ */

export async function layTho(chiActive = false): Promise<Tho[]> {
  const sb = getServiceClient();
  let q = sb.from("tho").select("id,ten,mau,active,thu_tu").order("thu_tu").order("ten");
  if (chiActive) q = q.eq("active", true);
  const { data } = await q;
  return (data || []).map((r: any) => ({ id: r.id, ten: r.ten, mau: r.mau || "#0EA5E9", active: r.active !== false, thuTu: r.thu_tu || 0 }));
}

export async function layDichVu(chiActive = false): Promise<DichVu[]> {
  const sb = getServiceClient();
  let q = sb.from("dich_vu").select("id,ten,phut,gia,active,thu_tu").order("thu_tu").order("ten");
  if (chiActive) q = q.eq("active", true);
  const { data } = await q;
  return (data || []).map((r: any) => ({ id: r.id, ten: r.ten, phut: r.phut, gia: Number(r.gia || 0), active: r.active !== false, thuTu: r.thu_tu || 0 }));
}

/* -------------------------------------------------------------- ĐỌC LỊCH */

export async function lichTheoNgay(ngay: string): Promise<LichHen[]> {
  const sb = getServiceClient();
  const { data } = await sb.from("lich_hen").select(COT).eq("ngay", ngay).order("phut_bd");
  return (data || []).map(doHen);
}

/** Lịch của MỘT khách theo SĐT — dùng cho thẻ khách và trang khách tự đặt. */
export async function lichCuaKhach(sdt: string, gioiHan = 20): Promise<LichHen[]> {
  const norm = chuanSdt(sdt);
  if (!norm) return [];
  const sb = getServiceClient();
  const { data } = await sb.from("lich_hen").select(COT).eq("sdt_norm", norm)
    .order("ngay", { ascending: false }).order("phut_bd", { ascending: false }).limit(gioiHan);
  return (data || []).map(doHen);
}

/* --------------------------------------------------------------- GHI LỊCH */

export type DatLichInput = {
  ngay: string; phutBd: number; thoId: string; dichVuId?: string | null;
  khachTen: string; sdt?: string | null; ghiChu?: string | null;
  nguon?: "tiem" | "web";
};

export type KetQua = { ok: true; id: string } | { ok: false; loi: string };

/**
 * Đặt lịch. Thời lượng và giá LẤY TỪ CSDL theo dịch vụ, KHÔNG nhận từ trình duyệt —
 * trang khách tự đặt là trang công khai, tin số do nó gửi lên là mời người ta sửa giá.
 */
export async function datLich(i: DatLichInput): Promise<KetQua> {
  const sb = getServiceClient();
  const ten = (i.khachTen || "").trim();
  if (!ten) return { ok: false, loi: "Chưa có tên khách" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.ngay)) return { ok: false, loi: "Ngày không hợp lệ" };
  if (!i.thoId) return { ok: false, loi: "Chưa chọn thợ" };

  const caiDat = await layCaiDat();

  let phut = 60, gia = 0, dvTen: string | null = null, dvId: string | null = null;
  if (i.dichVuId) {
    const { data: dv } = await sb.from("dich_vu").select("id,ten,phut,gia,active").eq("id", i.dichVuId).maybeSingle();
    if (!dv || dv.active === false) return { ok: false, loi: "Dịch vụ không còn nhận" };
    phut = dv.phut; gia = Number(dv.gia || 0); dvTen = dv.ten; dvId = dv.id;
  }

  const { data: tho } = await sb.from("tho").select("id,active").eq("id", i.thoId).maybeSingle();
  if (!tho || tho.active === false) return { ok: false, loi: "Thợ này đang không nhận khách" };

  if (i.phutBd < caiDat.gioMo || i.phutBd + phut > caiDat.gioDong) {
    return { ok: false, loi: "Giờ này ngoài giờ mở cửa" };
  }

  const { data, error } = await sb.from("lich_hen").insert({
    ngay: i.ngay, phut_bd: i.phutBd, phut,
    tho_id: i.thoId, dich_vu_id: dvId, dich_vu_ten: dvTen, gia,
    khach_ten: ten, sdt: (i.sdt || "").trim() || null, sdt_norm: chuanSdt(i.sdt),
    ghi_chu: (i.ghiChu || "").trim() || null, nguon: i.nguon || "tiem",
  }).select("id").single();

  if (error) {
    // 23P01 = vi phạm ràng buộc EXCLUDE -> đúng ca hai người cùng đặt một khung giờ.
    if ((error as any).code === "23P01" || /lich_hen_khong_trung/.test(error.message || "")) {
      return { ok: false, loi: "Khung giờ này vừa có người đặt mất rồi, chọn giờ khác giúp em" };
    }
    return { ok: false, loi: error.message || "Không ghi được lịch" };
  }
  return { ok: true, id: data!.id };
}

export async function doiTrangThai(id: string, trangThai: TrangThai): Promise<KetQua> {
  const sb = getServiceClient();
  const { error } = await sb.from("lich_hen")
    .update({ trang_thai: trangThai, updated_at: new Date().toISOString() }).eq("id", id);
  return error ? { ok: false, loi: error.message } : { ok: true, id };
}

/**
 * Khách đến xong -> sinh ĐƠN HÀNG. Đi qua bảng `don_hang` của lõi, KHÔNG đụng gì
 * của mảng Zalo; thẻ VIP/Mua lại bên hộp thư tự hiện vì chúng gặp nhau ở sdt_norm.
 * Chống bấm hai lần: đã có don_hang_id thì thôi.
 */
export async function xongTaoDon(id: string): Promise<KetQua> {
  const sb = getServiceClient();
  const { data: h } = await sb.from("lich_hen").select(COT).eq("id", id).maybeSingle();
  if (!h) return { ok: false, loi: "Không thấy lịch hẹn" };
  if (h.don_hang_id) return { ok: true, id: h.don_hang_id };
  if (!h.sdt_norm) return { ok: false, loi: "Lịch này chưa có số điện thoại, chưa ghi đơn được" };

  const { data: don, error } = await sb.from("don_hang").insert({
    sdt: h.sdt_norm, khach: h.khach_ten, khach_tra: Number(h.gia || 0),
    ngay: h.ngay, san_pham: h.dich_vu_ten ? [h.dich_vu_ten] : [],
  }).select("id").single();
  if (error) return { ok: false, loi: error.message };

  await sb.from("lich_hen").update({
    trang_thai: "den", don_hang_id: don!.id, updated_at: new Date().toISOString(),
  }).eq("id", id);
  return { ok: true, id: don!.id };
}

/* ----------------------------------------------------------- NHẮC LỊCH */

/** Hẹn NGÀY MAI còn ở trạng thái "đã đặt" và CHƯA nhắc. */
export async function canNhac(): Promise<LichHen[]> {
  const sb = getServiceClient();
  const mai = congNgay(vnDateStr(), 1);
  const { data } = await sb.from("lich_hen").select(COT)
    .eq("ngay", mai).eq("trang_thai", "dat").is("nhac_luc", null).order("phut_bd");
  return (data || []).map(doHen);
}

export async function danhDauDaNhac(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await getServiceClient().from("lich_hen").update({ nhac_luc: new Date().toISOString() }).in("id", ids);
}

/* ------------------------------------------------------------ CHỖ TRỐNG */

/** Chỗ trống của từng thợ cho một dịch vụ — dùng cho cả màn trong tiệm lẫn trang khách. */
export async function choTrongTheoTho(ngay: string, dichVuId: string | null): Promise<
  Array<{ thoId: string; thoTen: string; gio: number[] }>
> {
  const [caiDat, tho, hen, dv] = await Promise.all([
    layCaiDat(), layTho(true), lichTheoNgay(ngay),
    dichVuId ? layDichVu(true).then((ds) => ds.find((d) => d.id === dichVuId) || null) : Promise.resolve(null),
  ]);
  const phut = dv?.phut ?? caiDat.buoc;
  const homNay = vnDateStr();
  const bayGio = ngay === homNay ? Math.floor((Date.now() + 7 * 3600e3) / 60000) % 1440 : null;

  return tho.map((t) => ({
    thoId: t.id, thoTen: t.ten,
    gio: choTrong({
      phut,
      ban: hen.filter((h) => h.thoId === t.id).map((h) => ({ phutBd: h.phutBd, phut: h.phut, trangThai: h.trangThai })),
      caiDat, bayGio, demTruoc: 30,
    }),
  }));
}
