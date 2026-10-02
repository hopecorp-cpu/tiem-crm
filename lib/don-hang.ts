/**
 * MẢNG ĐƠN HÀNG — phần THUẦN (không đụng CSDL, không đụng mảng khác).
 * Client component nhập được file này; phần hỏi CSDL nằm ở `don-hang-server.ts`.
 *
 * Luật biên: mảng đơn KHÔNG nhập gì từ `hop-thu-zalo*` hay `lich*`. Dùng chung lấy ở `@/lib/chung`.
 * Đơn sinh từ lịch hẹn đi qua `lich-server.xongTaoDon` và ghi thẳng vào bảng `don_hang` của lõi —
 * hai đường cùng đổ về một bảng, cố ý không gọi nhau.
 */

export type DonHang = {
  id: string;
  sdt: string;
  sdtNorm: string | null;
  khach: string | null;
  khachTra: number;
  ngay: string | null;      // YYYY-MM-DD
  sanPham: string[];
  sale: string | null;
  ghiChu: string | null;
  tuLich: boolean;          // true = do màn Lịch hẹn sinh ra, không phải gõ tay
  taoLuc: string | null;
};

/* ------------------------------------------------------------- SỐ TIỀN */

/**
 * Đọc số tiền chủ tiệm gõ tay. Người Việt gõ "500k", "1tr2", "1.500.000", "1,5 triệu"
 * — bắt máy phải gõ đủ số 0 là chắc chắn có ngày nhập thiếu/thừa một chữ số.
 *
 * LUẬT CỐ Ý, đừng "cải tiến" thành đoán hộ: số TRẦN là số tiền ĐÚNG như gõ.
 * "350" = 350 đồng, KHÔNG tự hiểu thành 350.000. Đoán hộ thì sai âm thầm; màn nhập
 * in lại số đã hiểu ngay dưới ô ("= 350 đ") nên người gõ thấy sai là sửa được ngay.
 *
 * Trả `null` khi không đọc nổi — để nơi gọi báo lỗi, KHÔNG trả 0 (0 là một số tiền hợp lệ,
 * lẫn "không hiểu" vào "không đồng" là mất tiền mà không ai biết).
 */
export function docTien(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
  let s = String(v ?? "").toLowerCase().trim();
  if (!s) return null;
  s = s.replace(/\s|đ|vnd|₫/g, "");
  if (!s) return null;

  // Hậu tố nhân: triệu trước nghìn (cụm DÀI đặt trước cụm NGẮN, nếu không "tr" nuốt mất "trieu").
  const NHAN: [RegExp, number][] = [
    [/^(.*?)(?:triệu|trieu|tr|m)(.*)$/, 1_000_000],
    [/^(.*?)(?:nghìn|nghin|ngàn|ngan|ng|k)(.*)$/, 1_000],
  ];
  for (const [re, he] of NHAN) {
    const m = s.match(re);
    if (!m) continue;
    const dau = m[1], duoi = m[2];
    const g = soTho(dau);
    if (g === null) return null;
    // "1tr2" = 1,2 triệu: phần sau hậu tố là PHẦN LẺ theo bậc kế tiếp, không phải cộng thẳng.
    if (duoi) {
      if (!/^\d+$/.test(duoi)) return null;
      const le = Number("0." + duoi);
      return Math.round(g * he + le * he);
    }
    return Math.round(g * he);
  }
  const g = soTho(s);
  return g === null ? null : Math.round(g);
}

/**
 * "1.500.000" và "1,500,000" là dấu phân nhóm; "1,5" và "1.5" là dấu thập phân.
 * Phân biệt bằng CÁCH DÙNG chứ không bằng ký tự: nhóm thì mọi cụm sau dấu đúng 3 chữ số.
 */
function soTho(s: string): number | null {
  if (!s) return null;
  if (!/^[\d.,]+$/.test(s)) return null;
  const phan = s.split(/[.,]/);
  if (phan.some((p) => p === "")) return null;
  if (phan.length === 1) return Number(phan[0]);
  const laNhom = phan.slice(1).every((p) => p.length === 3);
  if (laNhom) return Number(phan.join(""));
  if (phan.length !== 2) return null;              // "1.5.7" vô nghĩa
  return Number(phan[0] + "." + phan[1]);
}

export function tienDep(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " đ";
}

/* ---------------------------------------------------------- DANH SÁCH */

/** Danh sách món: nhận cả `["A","B"]` lẫn `[{ten:"A"}]` — hai đời dữ liệu cùng tồn tại. */
export function docSanPham(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : x && typeof x === "object" ? String((x as any).ten ?? "") : ""))
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Ô nhập một dòng -> danh sách món. Ngăn bằng dấu phẩy, bỏ phần rỗng. */
export function tachMon(s: string): string[] {
  return String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
}

/** Đầu và cuối của một tháng YYYY-MM. Trả `null` nếu chuỗi tháng sai. */
export function khoangThang(thang: string): { tu: string; den: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(String(thang || ""));
  if (!m) return null;
  const nam = Number(m[1]), th = Number(m[2]);
  if (th < 1 || th > 12) return null;
  const cuoi = new Date(Date.UTC(nam, th, 0)).getUTCDate();
  return { tu: `${m[1]}-${m[2]}-01`, den: `${m[1]}-${m[2]}-${String(cuoi).padStart(2, "0")}` };
}

/** Tháng YYYY-MM của hôm nay theo giờ VN. */
export function thangNay(homNay: string): string {
  return String(homNay || "").slice(0, 7);
}

export function luiThang(thang: string, so: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(thang);
  if (!m) return thang;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + so, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/* ------------------------------------------------------------ TỔNG KẾT */

export type TongKet = {
  soDon: number;
  tongTien: number;
  /** Giỏ trung bình. `null` khi chưa có đơn nào — KHÔNG trả 0, vì 0 đọc thành "bán ế". */
  giaTb: number | null;
  soKhach: number;
  tuLich: number;
  nhapTay: number;
};

export function tongKet(ds: DonHang[]): TongKet {
  const tong = ds.reduce((s, d) => s + (Number(d.khachTra) || 0), 0);
  const khach = new Set(ds.map((d) => d.sdtNorm || d.sdt).filter(Boolean));
  const tuLich = ds.filter((d) => d.tuLich).length;
  return {
    soDon: ds.length,
    tongTien: tong,
    giaTb: ds.length ? Math.round(tong / ds.length) : null,
    soKhach: khach.size,
    tuLich,
    nhapTay: ds.length - tuLich,
  };
}

/** Lọc tại chỗ theo ô tìm: tên khách, số điện thoại, hoặc tên món. */
export function loc(ds: DonHang[], tim: string): DonHang[] {
  const t = String(tim || "").toLowerCase().trim();
  if (!t) return ds;
  const soTim = t.replace(/[^0-9]/g, "");
  return ds.filter((d) => {
    if ((d.khach || "").toLowerCase().includes(t)) return true;
    if (d.sanPham.some((m) => m.toLowerCase().includes(t))) return true;
    if ((d.sale || "").toLowerCase().includes(t)) return true;
    if (soTim.length >= 3) {
      const sdt = (d.sdt || "").replace(/[^0-9]/g, "");
      if (sdt.includes(soTim)) return true;
    }
    return false;
  });
}

/** Kiểm trước khi ghi. Trả danh sách lỗi bằng tiếng người, rỗng là qua. */
export function kiemDon(d: { sdt?: string; khachTra?: unknown; ngay?: string }): string[] {
  const loi: string[] = [];
  if (!String(d.sdt || "").replace(/[^0-9]/g, "")) loi.push("Thiếu số điện thoại khách");
  if (docTien(d.khachTra) === null) loi.push("Số tiền không đọc được");
  if (d.ngay && !/^\d{4}-\d{2}-\d{2}$/.test(d.ngay)) loi.push("Ngày sai định dạng");
  return loi;
}
