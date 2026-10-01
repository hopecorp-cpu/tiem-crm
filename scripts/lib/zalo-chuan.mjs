/**
 * Hàm THUẦN dùng chung cho các script Zalo (.mjs).
 *
 * `chuanSdt` TRÙNG với chuanSdt() của lib/hop-thu-zalo.ts — script .mjs không import được
 * lib/*.ts nên buộc có hai bản; sửa một chỗ phải sửa cả hai, không thì phép nối SĐT sang
 * đơn hàng hụt âm thầm.
 */

/** Chuẩn hoá SĐT về 84xxx — trục nối sang bảng don_hang. */
export function chuanSdt(p) {
  if (!p) return null;
  let s = String(p).replace(/[^0-9]/g, "");
  if (!s) return null;
  if (s.startsWith("0")) s = "84" + s.slice(1);
  if (!s.startsWith("84")) s = "84" + s;
  return s.length >= 10 && s.length <= 13 ? s : null;
}

/**
 * Bóc SĐT từ TÊN HIỂN THỊ. Nhiều đội đặt tên hội thoại kiểu "Chị A Hải Phòng 0381234567" —
 * số nằm trong tên chứ Zalo gần như không trả trường phoneNumber. Bỏ qua chỗ này là phần
 * lớn khách không nối được sang đơn hàng.
 * Chỉ nhận đầu số di động VN thật (03/05/07/08/09) để không bắt nhầm mã lớp, số hộp, giá tiền.
 */
export function sdtTrongTen(ten) {
  const s = String(ten || "").replace(/[.\s\-()]/g, "");
  const m = s.match(/(?:\+?84|0)([35789]\d{8})(?!\d)/);
  return m ? "0" + m[1] : null;
}
