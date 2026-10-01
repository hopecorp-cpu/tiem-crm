import "server-only";
import { getServiceClient } from "@/lib/supabase-server";
import { chuanSdt, tienDep, vnDateStr, ngayDep } from "@/lib/chung";
import { hhmm, phutDep } from "@/lib/lich";
import { layDichVu, layCaiDat, lichCuaKhach } from "@/lib/lich-server";
import { timTuCam } from "@/lib/tu-cam";

/**
 * BOT TƯ VẤN — DÙNG CHUNG cho mọi kênh (Zalo, Facebook, và kênh nào thêm sau).
 *
 * BỐN QUYẾT ĐỊNH, đừng sửa ngược:
 *
 * 1. BOT KHÔNG GỬI TIN. Nó chỉ trả lời "nên nói gì". Kênh nào tự gửi bằng đường của
 *    kênh đó (Zalo qua hàng đợi cầu nối, Facebook qua Graph API). Nhờ vậy bot không
 *    phải biết gì về Zalo hay Facebook, và thêm kênh mới không phải sửa bot.
 *
 * 2. KHÔNG CẦN AI, KHÔNG TỐN ĐỒNG NÀO. Câu trả lời lấy từ DỮ LIỆU THẬT của tiệm:
 *    bảng giá đọc từ `dich_vu`, giờ mở cửa từ `config`, lịch của khách từ `lich_hen`.
 *    Bot đọc bảng giá thì không bao giờ nói sai giá — khác hẳn bot nhồi câu trả lời
 *    cứng vào mã rồi tháng sau tăng giá là nói sai với mọi khách.
 *
 * 3. BOT BIẾT IM. Nó CHỈ nhận bốn việc: bảng giá · giờ & địa chỉ · đặt lịch · xem lịch
 *    của tôi. Ngoài ra là nhường người thật. Bot cố đoán rồi trả lời bừa thì tệ hơn
 *    hẳn bot im, vì khách tưởng đã được tư vấn rồi bỏ đi.
 *
 * 4. KHÔNG BAO GIỜ ĐÁP CÂU DÍNH DANH SÁCH NGƯỜI-THẬT (khiếu nại, dị ứng, sưng, hoàn
 *    tiền…). Khách đang bực hoặc đang đau mà gặp máy trả lời là mất khách thật.
 */

export type Kenh = "zalo" | "facebook";
export type YDinh = "chao" | "gia" | "gio" | "dat-lich" | "lich-cua-toi" | "cam-on" | "khong-hieu" | "nguoi-that";

export type TraLoi = {
  tra: string | null;          // null = bot không nói gì
  chuyenNguoi: boolean;        // cần người thật vào
  yDinh: YDinh;
  lyDo: string;                // vì sao ra kết quả này — hiện ở màn thử bot
};

export type CauHoi = {
  kenh: Kenh;
  tin: string;
  sdt?: string | null;
  tenKhach?: string | null;
  /** Bot đã nói liên tiếp bao nhiêu lượt cho khách này (để biết lúc nào nhường người). */
  soLuotBotDaNoi?: number;
  /** Nhân viên đã vào tay hội thoại này chưa. */
  botTat?: boolean;
  /** Mốc bot đáp gần nhất cho khách này — chống đáp dồn. */
  dapGanNhat?: string | null;
  /** CHỈ dùng cho màn THỬ BOT: xem bot ĐỊNH nói gì dù ngoài đời đang tắt. Không gửi đi đâu. */
  boQuaTat?: boolean;
};

export type CauHinhBot = {
  bat: boolean; nguoiSau: number; nghiPhut: number;
  diaChi: string; loiChao: string; tuKhoaNguoi: string[];
};

/** Bỏ dấu + hạ chữ thường để dò từ khoá. `đ` phải đổi TRƯỚC khi tách dấu — NFD không tách được nó. */
export function khongDau(s: string): string {
  return String(s || "").toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const TU = {
  chao:   ["chao", "hello", "hi", "alo", "shop oi", "ad oi", "em oi", "co ai", "co ai khong"],
  gia:    ["gia", "bao nhieu", "bn tien", "bao nhiu", "nhieu tien", "bang gia", "chi phi", "bao tien", "may gia"],
  gio:    ["may gio", "gio nao", "mo cua", "dong cua", "dia chi", "o dau", "cho nao", "duong nao", "chi duong"],
  datLich: ["dat lich", "dat cho", "booking", "hen", "dang ky lich", "lich trong", "con cho", "con slot", "muon lam"],
  lichToi: ["lich cua toi", "lich cua minh", "toi dat luc", "minh dat luc", "em dat luc", "kiem tra lich", "xem lich"],
  camOn:  ["cam on", "thanks", "thank you", "oke", "dc roi", "duoc roi"],
};

const THOAT = /[.*+?^${}()|[\]\\]/g;

/**
 * So khớp từ khoá CÓ RANH GIỚI TỪ — đừng bao giờ quay lại `text.includes(tu)`.
 *
 * Hai lỗi thật đã sập vì so chuỗi con, bài kiểm `scripts/kiem/bot.mjs` bắt được:
 *  - "hôm nay trời đẹp NHỈ ANH..." dính từ chào "hi" (nằm trong "nhi anh");
 *  - "tiệm ở ĐÂU vậy" dính từ cầu cứu "đau" (bỏ dấu thì ĐÂU và ĐAU đều ra "dau"),
 *    tức MỌI khách hỏi địa chỉ đều bị đẩy sang người thật.
 *
 * `\b` của JS CHỈ hiểu A-Za-z0-9_ nên vô dụng với tiếng Việt có dấu — phải tự viết
 * ranh giới bằng \p{L}\p{N}\p{M}. CẤM dùng lookbehind: Safari cũ nổ cả gói JS.
 */
function khop(van: string, tu: string): boolean {
  const t = tu.trim();
  if (!t) return false;
  return new RegExp(
    `(^|[^\\p{L}\\p{N}\\p{M}])${t.replace(THOAT, "\\$&")}(?![\\p{L}\\p{N}\\p{M}])`, "u"
  ).test(van);
}

const co = (t: string, ds: string[]) => ds.some((k) => khop(t, k));

/**
 * Từ khoá "để người thật xử lý" soi HAI LƯỢT:
 *  1. trên câu GỐC còn dấu — ở đó "đau" khác "đâu", không bắt nhầm;
 *  2. trên câu đã bỏ dấu, nhưng CHỈ với từ khoá dài từ 5 chữ cái trở lên. Khách hay
 *     gõ không dấu ("toi muon khieu nai") nên cần lượt này, còn từ ngắn như "đau",
 *     "sưng" thì bỏ dấu là đụng hàng loạt từ thường — chặn lượt 2 cho chúng.
 */
function dinhTuKhoaNguoi(goc: string, khongDauVan: string, ds: string[]): boolean {
  for (const k of ds) {
    if (!k) continue;
    if (khop(goc, k.toLowerCase())) return true;
    const kd = khongDau(k);
    if (kd.replace(/\s/g, "").length >= 5 && khop(khongDauVan, kd)) return true;
  }
  return false;
}

export function doanYDinh(tin: string, tuKhoaNguoi: string[]): YDinh {
  const goc = String(tin || "").toLowerCase();
  const t = khongDau(tin);
  if (!t.trim()) return "khong-hieu";
  // Người thật thắng MỌI thứ khác — kiểm trước tiên.
  if (dinhTuKhoaNguoi(goc, t, tuKhoaNguoi)) return "nguoi-that";
  if (co(t, TU.lichToi)) return "lich-cua-toi";
  if (co(t, TU.datLich)) return "dat-lich";
  if (co(t, TU.gia)) return "gia";
  if (co(t, TU.gio)) return "gio";
  if (co(t, TU.camOn)) return "cam-on";
  if (co(t, TU.chao) || t.length <= 12) return "chao";
  return "khong-hieu";
}

export async function layCauHinh(): Promise<CauHinhBot> {
  const { data } = await getServiceClient().from("config").select("key,value")
    .in("key", ["bot_bat", "bot_nguoi_sau", "bot_nghi_phut", "bot_dia_chi", "bot_loi_chao", "bot_tu_khoa_nguoi"]);
  const m = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
  const so = (v: any, md: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : md; };
  return {
    bat: m.bot_bat === "1",
    nguoiSau: so(m.bot_nguoi_sau, 2),
    nghiPhut: so(m.bot_nghi_phut, 1),
    diaChi: (m.bot_dia_chi || "").trim(),
    loiChao: (m.bot_loi_chao || "").trim(),
    tuKhoaNguoi: String(m.bot_tu_khoa_nguoi || "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

/** Địa chỉ trang khách tự đặt lịch — để bot dán cho khách. */
function linkDatLich(): string {
  const goc = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  return goc ? `${goc}/dat-lich` : "/dat-lich";
}

export async function traLoi(h: CauHoi): Promise<TraLoi> {
  const ch = await layCauHinh();
  const im = (lyDo: string, yDinh: YDinh = "nguoi-that", chuyen = true): TraLoi =>
    ({ tra: null, chuyenNguoi: chuyen, yDinh, lyDo });

  if (!ch.bat && !h.boQuaTat) return im("bot đang tắt trong cài đặt", "khong-hieu");
  if (h.botTat) return im("nhân viên đã vào tay hội thoại này");

  // Chống đáp dồn: khách gõ liền 5 câu thì bot đáp 5 lần là phản tác dụng.
  if (h.dapGanNhat) {
    const cach = (Date.now() - Date.parse(h.dapGanNhat)) / 60000;
    if (Number.isFinite(cach) && cach < ch.nghiPhut) return im(`vừa đáp cách đây ${Math.round(cach)} phút`, "khong-hieu");
  }

  const yDinh = doanYDinh(h.tin, ch.tuKhoaNguoi);
  if (yDinh === "nguoi-that") return im("câu có từ khoá phải để người thật xử lý");
  if (yDinh === "cam-on") return { tra: null, chuyenNguoi: false, yDinh, lyDo: "khách cảm ơn, không cần đáp" };

  // Bot nói quá số lượt cho phép mà khách vẫn hỏi tiếp -> đang không giải quyết được.
  if ((h.soLuotBotDaNoi || 0) >= ch.nguoiSau && yDinh !== "lich-cua-toi") {
    return im(`bot đã đáp ${h.soLuotBotDaNoi} lượt, nhường người thật`);
  }

  const caiDat = await layCaiDat();
  const xung = h.tenKhach ? `Chào ${h.tenKhach},` : "Dạ chào anh/chị,";
  let tra = "";

  if (yDinh === "chao") {
    tra = ch.loiChao
      || `${xung} ${caiDat.tenTiem} xin nghe ạ. Anh/chị cần xem bảng giá, hỏi giờ mở cửa hay đặt lịch ạ?`;
  }

  else if (yDinh === "gia") {
    const dv = await layDichVu(true);
    if (!dv.length) return im("tiệm chưa khai dịch vụ nào nên bot không có bảng giá để đọc");
    const dong = dv.slice(0, 12).map((d) => `· ${d.ten} — ${tienDep(d.gia)} (${phutDep(d.phut)})`);
    tra = `${xung} bảng giá bên em ạ:\n${dong.join("\n")}`
      + (dv.length > 12 ? `\n… và ${dv.length - 12} dịch vụ khác ạ.` : "")
      + `\n\nAnh/chị muốn đặt lịch thì vào đây giúp em: ${linkDatLich()}`;
  }

  else if (yDinh === "gio") {
    tra = `${xung} ${caiDat.tenTiem} mở cửa ${hhmm(caiDat.gioMo)} – ${hhmm(caiDat.gioDong)} hằng ngày ạ.`;
    if (ch.diaChi) tra += `\nĐịa chỉ: ${ch.diaChi}`;
    tra += `\n\nĐặt lịch trước cho khỏi phải chờ ạ: ${linkDatLich()}`;
  }

  else if (yDinh === "dat-lich") {
    tra = `${xung} anh/chị đặt lịch ở đây giúp em ạ, chọn dịch vụ và giờ là xong:\n${linkDatLich()}`
      + `\n\nHoặc nhắn em tên dịch vụ và giờ muốn làm, em xếp hộ ạ.`;
  }

  else if (yDinh === "lich-cua-toi") {
    const sdt = chuanSdt(h.sdt);
    if (!sdt) {
      return { tra: `${xung} anh/chị cho em xin số điện thoại đã dùng lúc đặt để em tra giúp ạ.`,
               chuyenNguoi: false, yDinh, lyDo: "chưa biết số của khách nên phải hỏi" };
    }
    const ds = (await lichCuaKhach(sdt, 5)).filter((x) => x.ngay >= vnDateStr() && x.trangThai === "dat");
    if (!ds.length) {
      return { tra: `${xung} em chưa thấy lịch nào sắp tới với số này ạ. Anh/chị đặt mới ở đây nhé: ${linkDatLich()}`,
               chuyenNguoi: false, yDinh, lyDo: "tra sổ: không có lịch sắp tới" };
    }
    tra = `${xung} lịch sắp tới của anh/chị ạ:\n`
      + ds.map((x) => `· ${ngayDep(x.ngay)} lúc ${hhmm(x.phutBd)} — ${x.dichVuTen || "dịch vụ"}`).join("\n")
      + `\n\nCần đổi giờ thì nhắn em ạ.`;
  }

  else {
    return im("không nhận ra khách hỏi gì", "khong-hieu");
  }

  // CỬA TỪ CẤM — bot là chữ đi thẳng tới khách, phải soi y như tin người gõ.
  // Dính thì IM và gọi người, TUYỆT ĐỐI không tự sửa câu rồi gửi.
  const cam = await timTuCam(tra);
  if (cam.length) return im(`câu bot soạn dính từ cấm: ${cam.join(", ")}`, yDinh);

  return { tra, chuyenNguoi: false, yDinh, lyDo: "trả lời từ dữ liệu thật của tiệm" };
}
