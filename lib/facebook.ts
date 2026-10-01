/**
 * MẢNG FACEBOOK — phần THUẦN (client component nhập được).
 * Phần gọi Graph API và CSDL nằm ở `facebook-server.ts`.
 */

export type FbTrang = {
  pageId: string; ten: string | null; daDangKy: boolean; active: boolean;
  loiCuoi: string | null; kiemLuc: string | null; duoiToken: string;
};

export type FbKhach = {
  pageId: string; psid: string; ten: string | null; anh: string | null;
  sdt: string | null; sdtNorm: string | null;
  lastContent: string | null; lastMsgAt: string | null; lastInAt: string | null;
  unreplied: boolean; botTat: boolean; msgCount: number;
};

export type FbTin = {
  mid: string; direction: "in" | "out"; content: string | null;
  boi: string | null; sentAt: string | null;
};

export const CUA_SO_GIO = 24;

/**
 * CỬA SỔ 24 GIỜ của Messenger — tính từ tin CUỐI CỦA KHÁCH, không phải tin cuối
 * của hội thoại. Hết hạn thì Facebook TỪ CHỐI, nên app phải báo TRƯỚC khi lễ tân
 * gõ xong cả đoạn rồi mới biết không gửi được.
 */
export function cuaSo(lastInAt?: string | null): { conMo: boolean; conPhut: number | null } {
  if (!lastInAt) return { conMo: false, conPhut: null };
  const t = Date.parse(lastInAt);
  if (!Number.isFinite(t)) return { conMo: false, conPhut: null };
  const con = Math.floor((t + CUA_SO_GIO * 3600e3 - Date.now()) / 60000);
  return { conMo: con > 0, conPhut: con };
}

/** "còn 3 tiếng 20 phút" — chữ cho lễ tân đọc. */
export function cuaSoDep(lastInAt?: string | null): string {
  const { conMo, conPhut } = cuaSo(lastInAt);
  if (conPhut == null) return "chưa có tin của khách";
  if (!conMo) return "hết cửa sổ 24 giờ — Facebook sẽ chặn tin";
  const h = Math.floor(conPhut / 60), p = conPhut % 60;
  return h ? `còn ${h} tiếng ${p} phút để nhắn` : `còn ${p} phút để nhắn`;
}

/** Che token, chỉ chừa 4 ký tự cuối — dùng mọi nơi hiện token ra màn hình. */
export function cheToken(t?: string | null): string {
  const s = String(t || "");
  return s.length <= 4 ? "••••" : "••••" + s.slice(-4);
}
