/**
 * HỘP THƯ ZALO — phần THUẦN (kiểu dữ liệu + hàm tính không đụng server).
 *
 * Tách khỏi `hop-thu-zalo-server.ts` vì client component KHÔNG được import thứ kéo theo
 * `supabase-server`/`next/headers` — webpack vỡ lúc build mà `tsc` không bắt được.
 * Client component chỉ dùng `import type` với các kiểu ở đây.
 */

export type HopThuNick = {
  ownId: string;
  sale: string | null;      // khớp nguoi_dung.ho_ten — nhân viên đang cầm nick
  tenZalo: string | null;
  /** Nick còn kết nối Zalo không. null = chưa đo được.
   *  Cần trường này vì nick rớt kết nối thì khách nhắn vào KHÔNG hề vào hệ thống, còn hội
   *  thoại cũ vẫn nằm trong "đang chờ" và mỗi ngày một già thêm — không gắn cờ thì hộp thư
   *  đẻ ra một hàng chờ không có thật. */
  song: boolean | null;
  status: string | null;
};

export type HopThuKhach = {
  ownId: string;
  uid: string;
  ten: string;
  phone: string | null;
  phoneNorm: string | null;
  sale: string | null;
  tinCuoiAt: string | null;
  dangCho: boolean;         // khách nói câu cuối → đang chờ mình
  soTin: number;
  choGio: number | null;    // giờ khách đã chờ; null khi không phải mình nợ câu trả lời
  cauCuoi: string;
  huongCuoi: "in" | "out" | null;
  laNhom: boolean;
  chuaDoc: number;
  /** Thẻ suy từ ĐƠN HÀNG THẬT (bảng don_hang), không phải cờ ai đó bấm tay — cờ tay luôn
   *  thiếu và luôn trễ. Rỗng nghĩa là chưa nối được sang đơn (thường vì khách chưa lộ số). */
  the: TheKhach[];
  /** Nhãn NGƯỜI gắn — nằm CẠNH thẻ máy suy từ đơn, không thay nhau.
   *  Lệch nhau là thông tin, không phải lỗi. */
  tenZalo: string | null;
  ngaySinh: string | null;
  trangThai: string | null;
  laBanBe: boolean;
  nhanSale: string[];
};

export type TheKhach = "vip" | "da-mua" | "mua-lai" | "chua-mua";

/** Màu thẻ: VIP vàng · đã mua xanh lá · mua lại xanh Zalo · chưa mua cam nhạt "cần chăm sóc". */
export const NHAN_THE: Record<TheKhach, { chu: string; lop: string }> = {
  vip: { chu: "Khách VIP", lop: "bg-amber-100 text-amber-800" },
  "mua-lai": { chu: "Mua lại", lop: "bg-blue-100 text-[#0068FF]" },
  "da-mua": { chu: "Đã mua", lop: "bg-emerald-100 text-emerald-700" },
  "chua-mua": { chu: "Cần chăm sóc", lop: "bg-orange-100 text-orange-700" },
};

/** Số liệu cho trang Tổng quan. */
export type TongQuanZalo = {
  tongHoiThoai: number;
  soNhom: number;
  soChuaDoc: number;
  choTrongTuan: number;      // khách chờ ≤7 ngày — việc của tuần này
  choTatCa: number;
  choQua30Ngay: number;
  theoNick: {
    ownId: string; sale: string | null; song: boolean | null; status: string | null;
    hoiThoai: number; cho: number; choTrongTuan: number; choQua30Ngay: number; lauNhatNgay: number | null;
  }[];
  nhomThanhVien: number | null;   // tổng thành viên các nhóm, null = chưa đo được
  nhomDaDo: number;
};

/** Một nhóm Zalo. */
export type NhomZalo = {
  ownId: string;
  uid: string;
  ten: string;
  sale: string | null;
  soTin: number;
  tinCuoiAt: string | null;
  cauCuoi: string;
  soThanhVien: number | null;    // từ zalo_group_snapshots; null = chưa đo được nhóm này
};

/** Một dòng trong "Hoạt động gần đây" — gộp từ nhiều nguồn nên phải có nhãn nguồn. */
export type HoatDong = {
  luc: string | null;
  loai: "don" | "cham" | "goi" | "qua";
  tieuDe: string;
  chiTiet: string | null;
  nguoi: string | null;
};

export type HopThuTin = {
  id: string;
  huong: "in" | "out";
  noiDung: string;
  luc: string | null;
  /** Tin soạn từ app còn nằm hàng đợi, cầu nối chưa gửi (msg_id mở đầu `app-cho:`). */
  dangGui?: boolean;
  /** Cầu nối báo gửi hỏng (msg_id mở đầu `app-loi:`) — người phải gửi tay. */
  guiLoi?: boolean;
  /** Tin đã bị THU HỒI trên Zalo (sổ `zalo_thu_hoi`) — kho vẫn giữ nội dung gốc, hiện kèm nhãn. */
  thuHoi?: { luc: string; boi: string | null } | null;
};

/** Mã tin do APP soạn: chờ gửi `app-cho:<uuid>` · gửi hỏng `app-loi:<uuid>` · gửi xong đổi sang msg_id thật. */
export const laTinChoGui = (msgId: string) => String(msgId || "").startsWith("app-cho:");
export const laTinGuiLoi = (msgId: string) => String(msgId || "").startsWith("app-loi:");

export type DonCuaKhach = { ngay: string | null; sanPham: string; khachTra: number };

export type HoSoKhach = {
  ten: string;
  phone: string | null;
  sale: string | null;
  soDon: number;
  tongChi: number;
  donGanDay: DonCuaKhach[];
};

/** Tuổi kho — để trang nói thật số đang cũ tới đâu, thay vì vẽ ra vẻ tươi. */
export type TrangThaiKho = {
  ok: boolean;
  at: string | null;
  note: string | null;
  gioTre: number | null;
};

const NHAN_LOAI_TIN: Record<string, string> = {
  "chat.photo": "Hình ảnh", "chat.gif": "Ảnh động", "chat.video.msg": "Video",
  "chat.voice": "Ghi âm", "chat.sticker": "Sticker", "chat.location": "Vị trí",
  "chat.recommended": "Thẻ chia sẻ", "chat.link": "Liên kết", "share.file": "Tệp",
};

/**
 * Đổi mã loại tin của Zalo thành chữ đọc được, và CHẶN mã kỹ thuật lọt ra màn hình.
 * Gác ở lớp ĐỌC (không chỉ ở cầu nối) để mọi mã — cũ, mới, chưa biết — đều ra chữ.
 */
export function chuCuaTinCuoi(s?: string | null): string {
  const t = String(s || "").trim();
  if (!t) return "";
  if (/^\[.+\]$/.test(t)) return t;                 // đã được gắn nhãn từ trước
  // Buộc mở đầu bằng "chat."/"share." và KHÔNG có khoảng trắng — câu tiếng Việt không thể lọt vào đây.
  if (!/^(chat|share)\.[a-z0-9._-]+$/i.test(t)) return t;
  return `[${NHAN_LOAI_TIN[t.toLowerCase()] || "Tin đính kèm"}]`;
}

/** Chuẩn hoá SĐT về 84xxx — TRÙNG chuanSdt() của scripts/lib/zalo-chuan.mjs.
 *  Script .mjs không import được lib/*.ts nên buộc có hai bản; sửa một chỗ phải sửa cả hai. */
export function chuanSdt(p?: string | null): string | null {
  if (!p) return null;
  let s = String(p).replace(/[^0-9]/g, "");
  if (!s) return null;
  if (s.startsWith("0")) s = "84" + s.slice(1);
  if (!s.startsWith("84")) s = "84" + s;
  return s.length >= 10 && s.length <= 13 ? s : null;
}

/** Ngày hôm nay YYYY-MM-DD theo giờ Việt Nam. */
export function vnDateStr(): string {
  return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
}

/** Số giờ kể từ một mốc. */
export function gioTu(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.round(((Date.now() - t) / 36e5) * 10) / 10;
}

/** "3 phút" · "5 giờ" · "12 ngày" — dùng chung cho danh sách và khung chat. */
export function doTre(gio: number | null): string {
  if (gio == null) return "";
  if (gio < 1) return `${Math.max(1, Math.round(gio * 60))} phút`;
  if (gio < 24) return `${Math.round(gio)} giờ`;
  return `${Math.round(gio / 24)} ngày`;
}

/** Giờ trong ngày theo múi VN — nhãn cạnh mỗi bong bóng chat. */
export function gioVN(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
    });
  } catch { return ""; }
}

/** Ngày theo múi VN — dùng cho vạch ngăn ngày trong khung chat. */
export function ngayVN(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
    });
  } catch { return ""; }
}

export function tienVN(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("vi-VN");
}

/** Chữ cái đầu cho ô avatar (ảnh đại diện Zalo hết hạn nhanh nên không nhúng ảnh ngoài). */
export function chuDau(ten?: string | null): string {
  const s = String(ten || "").trim();
  if (!s) return "?";
  const w = s.split(/\s+/).filter(Boolean);
  const c = (w.length > 1 ? w[w.length - 2][0] + w[w.length - 1][0] : s.slice(0, 2));
  return c.toUpperCase();
}

/**
 * ĐIỂM NÓNG (lead scoring) — chấm TẤT ĐỊNH từ dữ liệu kho, không gọi mô hình
 * (0 đồng, chạy trên hàng nghìn khách mỗi lượt tải trang):
 * tín hiệu MUA (câu cuối hỏi giá/đặt/ship/còn hàng), tín hiệu SỐNG (vừa nhắn, đang chờ mình,
 * chưa đọc), tín hiệu QUAN HỆ (đã mua/mua lại/VIP theo đơn thật, kết bạn, có SĐT, nhãn gắn),
 * và TRỪ khi hội thoại chết lâu. Trả kèm LÝ DO để người dùng tin số — số không lý do là số để bị lờ.
 * Ngưỡng: ≥70 NÓNG · 40-69 ấm · <40 nguội. Đây là thứ tự ưu tiên gọi, KHÔNG phải kết luận về khách.
 */
export const TU_MUA = /(giá|bao nhiêu|bao nhiu|mua|đặt|order|lên đơn|ship|giao|còn hàng|combo|thanh toán|chuyển khoản|ck|cod|địa chỉ|hộp|thùng|lấy \d|cho e|cho em|gửi cho)/i;
export const TU_LANH = /(không quan tâm|ko quan tâm|k quan tâm|đừng nhắn|thôi nhé|không cần|ko cần|spam|chặn)/i;

export function chamDiemKhach(k: Pick<HopThuKhach, "dangCho" | "choGio" | "chuaDoc" | "cauCuoi" | "huongCuoi" | "the" | "laBanBe" | "phone" | "nhanSale" | "soTin" | "tinCuoiAt" | "laNhom">): { diem: number; lyDo: string[] } {
  if (k.laNhom) return { diem: 0, lyDo: [] };
  let diem = 20; const lyDo: string[] = [];
  const cau = String(k.cauCuoi || "");
  const gioTuTinCuoi = k.tinCuoiAt ? (Date.now() - Date.parse(k.tinCuoiAt)) / 36e5 : null;

  if (k.huongCuoi === "in" && TU_MUA.test(cau)) { diem += 30; lyDo.push("Khách đang hỏi giá/đặt hàng"); }
  if (k.dangCho && k.choGio != null && k.choGio <= 24) { diem += 20; lyDo.push("Vừa nhắn, đang chờ mình trả lời"); }
  else if (k.dangCho && k.choGio != null && k.choGio <= 24 * 7) { diem += 10; lyDo.push("Đang chờ trả lời trong tuần"); }
  if (k.chuaDoc > 0) { diem += 5; lyDo.push(`${k.chuaDoc} tin chưa đọc`); }
  if (gioTuTinCuoi != null && gioTuTinCuoi <= 48) { diem += 10; lyDo.push("Có tin trong 48 giờ"); }

  if (k.the.includes("mua-lai")) { diem += 15; lyDo.push("Đã mua lại"); }
  else if (k.the.includes("da-mua") || k.the.includes("vip")) { diem += 10; lyDo.push("Đã từng mua"); }
  if (k.the.includes("vip")) { diem += 10; lyDo.push("Khách VIP theo đơn"); }
  if (k.laBanBe) { diem += 5; lyDo.push("Đã kết bạn"); }
  if (k.phone) { diem += 5; lyDo.push("Có SĐT"); }
  if (k.nhanSale.some((n) => /vip|quen|tiềm năng|tiem nang|nóng|nong/i.test(n))) { diem += 10; lyDo.push("Đã gắn nhãn tiềm năng/VIP"); }
  if (k.soTin >= 20) { diem += 5; lyDo.push("Hội thoại dài (từ 20 tin)"); }

  if (TU_LANH.test(cau)) { diem -= 30; lyDo.push("Khách nói không quan tâm"); }
  if (gioTuTinCuoi != null && gioTuTinCuoi > 24 * 60) { diem -= 15; lyDo.push("Im hơn 60 ngày"); }
  else if (gioTuTinCuoi != null && gioTuTinCuoi > 24 * 30) { diem -= 5; lyDo.push("Im hơn 30 ngày"); }

  return { diem: Math.max(0, Math.min(100, diem)), lyDo };
}
export const mucDiem = (d: number): "nong" | "am" | "nguoi" => (d >= 70 ? "nong" : d >= 40 ? "am" : "nguoi");
