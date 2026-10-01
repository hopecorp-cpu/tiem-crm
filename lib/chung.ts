/**
 * LÕI — thứ MỌI mảng đều cần (Zalo, lịch hẹn, đơn hàng, Facebook…).
 *
 * Luật của repo này: mảng A cấm gọi thẳng vào ruột mảng B, chỉ được đi qua lõi.
 * Nên hàm nào từ hai mảng trở lên dùng thì đặt ở đây, không để nằm nhờ trong file
 * của một mảng rồi mảng khác chọc sang lấy.
 */

/**
 * Chuẩn hoá SĐT về dạng 84xxx — ĐÂY LÀ TRỤC NỐI giữa các mảng.
 * Lịch hẹn, đơn hàng và danh bạ Zalo không khoá ngoại vào nhau; chúng gặp nhau ở
 * con số này. Nên mọi nơi phải chuẩn hoá bằng CÙNG một hàm, lệch một kiểu là khách
 * tách làm hai người mà không ai thấy.
 *
 * TRÙNG với chuanSdt() của scripts/lib/zalo-chuan.mjs — script .mjs không import được
 * lib/*.ts nên buộc có hai bản; SỬA MỘT CHỖ PHẢI SỬA CẢ HAI.
 */
export function chuanSdt(p?: string | null): string | null {
  if (!p) return null;
  let s = String(p).replace(/[^0-9]/g, "");
  if (!s) return null;
  if (s.startsWith("0")) s = "84" + s.slice(1);
  if (!s.startsWith("84")) s = "84" + s;
  return s.length >= 10 && s.length <= 13 ? s : null;
}

/** 84987654321 -> 0987654321, để hiện cho người đọc. Không chuẩn hoá được thì trả nguyên. */
export function sdtDep(p?: string | null): string {
  const s = chuanSdt(p);
  if (!s) return (p || "").trim();
  return "0" + s.slice(2);
}

/** Hôm nay YYYY-MM-DD theo giờ Việt Nam (máy chủ thường chạy giờ UTC). */
export function vnDateStr(d?: Date): string {
  return new Date((d ? d.getTime() : Date.now()) + 7 * 3600e3).toISOString().slice(0, 10);
}

/** Cộng/trừ ngày cho chuỗi YYYY-MM-DD. */
export function congNgay(ngay: string, so: number): string {
  const t = Date.parse(ngay + "T00:00:00Z");
  if (!Number.isFinite(t)) return ngay;
  return new Date(t + so * 864e5).toISOString().slice(0, 10);
}

/** "2026-10-01" -> "Thứ Tư 01/10". Dùng ở đầu cột lịch. */
export function ngayDep(ngay: string): string {
  const t = Date.parse(ngay + "T00:00:00Z");
  if (!Number.isFinite(t)) return ngay;
  const d = new Date(t);
  const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${THU[d.getUTCDay()]} ${dd}/${mm}`;
}

/** 350000 -> "350.000đ" */
export function tienDep(n?: number | null): string {
  const v = Number(n || 0);
  return v.toLocaleString("vi-VN") + "đ";
}
