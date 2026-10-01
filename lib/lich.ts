/**
 * MẢNG LỊCH HẸN — phần THUẦN (không đụng CSDL, không đụng mảng khác).
 * Client component nhập được file này; phần hỏi CSDL nằm ở `lich-server.ts`.
 *
 * Luật biên: mảng lịch KHÔNG nhập gì từ `hop-thu-zalo*`. Thứ dùng chung lấy ở `@/lib/chung`.
 */

export type Tho = { id: string; ten: string; mau: string; active: boolean; thuTu: number };
export type DichVu = { id: string; ten: string; phut: number; gia: number; active: boolean; thuTu: number };
export type TrangThai = "dat" | "den" | "vang" | "huy";

export type LichHen = {
  id: string;
  ngay: string;            // YYYY-MM-DD
  phutBd: number;          // phút tính từ 0h
  phut: number;            // kéo dài bao lâu
  thoId: string;
  dichVuId: string | null;
  dichVuTen: string | null;
  gia: number;
  khachTen: string;
  sdt: string | null;
  sdtNorm: string | null;
  ghiChu: string | null;
  trangThai: TrangThai;
  nguon: string;
  nhacLuc: string | null;
  donHangId: string | null;
};

export const NHAN_TRANG_THAI: Record<TrangThai, string> = {
  dat: "Đã đặt", den: "Đã đến", vang: "Khách vắng", huy: "Đã huỷ",
};

export type CaiDatLich = {
  gioMo: number;      // phút từ 0h
  gioDong: number;
  buoc: number;       // bước chia khung, phút
  tenTiem: string;
  choDatWeb: boolean;
  toiDaNgay: number;
};

export const CAI_DAT_MAC_DINH: CaiDatLich = {
  gioMo: 9 * 60, gioDong: 20 * 60, buoc: 15,
  tenTiem: "Tiệm của bạn", choDatWeb: true, toiDaNgay: 30,
};

/** 570 -> "09:30" */
export function hhmm(phut: number): string {
  const p = ((Math.round(phut) % 1440) + 1440) % 1440;
  return `${String(Math.floor(p / 60)).padStart(2, "0")}:${String(p % 60).padStart(2, "0")}`;
}

/** "09:30" -> 570. Sai định dạng trả null (KHÔNG trả 0 — 0 là 0h00, một giá trị hợp lệ). */
export function phutTu(s?: string | null): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim());
  if (!m) return null;
  const h = Number(m[1]), p = Number(m[2]);
  if (h > 23 || p > 59) return null;
  return h * 60 + p;
}

/** "1 tiếng 30 phút" — hiện cho người đọc. */
export function phutDep(phut: number): string {
  const h = Math.floor(phut / 60), p = phut % 60;
  if (!h) return `${p} phút`;
  return p ? `${h} tiếng ${p} phút` : `${h} tiếng`;
}

/** Hai khoảng [a1,a2) và [b1,b2) có chồng nhau không. Chạm đầu đuôi KHÔNG tính là chồng. */
export function chongNhau(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2;
}

/**
 * Các giờ bắt đầu còn trống cho MỘT thợ, với một dịch vụ dài `phut`.
 *
 * Ba thứ dễ quên và đều đã tính ở đây:
 *  - lịch đã HUỶ thì nhả chỗ, phải loại khỏi danh sách bận;
 *  - ca phải KẾT THÚC trước giờ đóng cửa, không chỉ bắt đầu trước;
 *  - nếu là HÔM NAY thì bỏ các giờ đã trôi qua (cộng `demTruoc` phút chuẩn bị).
 */
export function choTrong(opts: {
  phut: number;
  ban: Array<{ phutBd: number; phut: number; trangThai: TrangThai }>;
  caiDat: CaiDatLich;
  /** phút hiện tại trong ngày; truyền null nếu ngày đó không phải hôm nay */
  bayGio?: number | null;
  demTruoc?: number;
}): number[] {
  const { phut, ban, caiDat } = opts;
  const demTruoc = opts.demTruoc ?? 0;
  if (phut <= 0) return [];
  const banThat = ban.filter((b) => b.trangThai !== "huy");
  const out: number[] = [];
  for (let t = caiDat.gioMo; t + phut <= caiDat.gioDong; t += caiDat.buoc) {
    if (opts.bayGio != null && t < opts.bayGio + demTruoc) continue;
    if (banThat.some((b) => chongNhau(t, t + phut, b.phutBd, b.phutBd + b.phut))) continue;
    out.push(t);
  }
  return out;
}

/** Tỷ lệ khách ĐẾN trên số hẹn đã tới hạn. Huỷ trước KHÔNG tính vào mẫu số — khách
 *  báo huỷ sớm là chuyện bình thường, gộp vào thì chỉ số nói sai về việc khách bỏ hẹn. */
export function tyLeDen(rows: Array<{ trangThai: TrangThai }>): {
  den: number; vang: number; huy: number; cho: number; pct: number | null;
} {
  let den = 0, vang = 0, huy = 0, cho = 0;
  for (const r of rows) {
    if (r.trangThai === "den") den++;
    else if (r.trangThai === "vang") vang++;
    else if (r.trangThai === "huy") huy++;
    else cho++;
  }
  const mau = den + vang;
  return { den, vang, huy, cho, pct: mau ? Math.round((den / mau) * 100) : null };
}

/** Câu nhắc lịch gửi khách — một chỗ duy nhất, để tin nhắn đi ra lúc nào cũng giống nhau. */
export function tinNhacLich(h: {
  khachTen: string; ngay: string; phutBd: number; dichVuTen?: string | null; thoTen?: string | null;
}, tenTiem: string): string {
  const [y, m, d] = h.ngay.split("-");
  const dong = [
    `Chào ${h.khachTen}, ${tenTiem} nhắc lịch hẹn ngày mai ạ.`,
    ``,
    `Thời gian: ${hhmm(h.phutBd)} ngày ${d}/${m}/${y}`,
  ];
  if (h.dichVuTen) dong.push(`Dịch vụ: ${h.dichVuTen}`);
  if (h.thoTen) dong.push(`Thợ: ${h.thoTen}`);
  dong.push(``, `Nếu bận mình nhắn lại giúp em để em xếp lại giờ nhé. Hẹn gặp ạ!`);
  return dong.join("\n");
}
