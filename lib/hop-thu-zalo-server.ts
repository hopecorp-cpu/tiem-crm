import "server-only";
import { getServiceClient } from "@/lib/supabase-server";
import {
  chuanSdt, gioTu, chuCuaTinCuoi, laTinChoGui, laTinGuiLoi,
  type HopThuKhach, type HopThuNick, type HopThuTin, type HoSoKhach, type TrangThaiKho,
  type HoatDong, type TongQuanZalo, type NhomZalo,
} from "@/lib/hop-thu-zalo";
import type { NguoiDung } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";

/**
 * HỘP THƯ ZALO — lớp đọc dữ liệu (server-side).
 *
 * Nguồn: bảng `zalo_bridge_*`, do cầu nối `scripts/zalo-bridge.mjs` (zca-js) ghi vào.
 * Cầu nối chạy trên một máy luôn bật (Mac/PC/VPS của bạn) — server web không nói chuyện
 * thẳng với Zalo được, nên đây BẮT BUỘC là mô hình kho-đổ-về.
 *
 * Các bảng bật RLS deny-all (nội dung chat + SĐT khách là dữ liệu cá nhân) nên chỉ
 * service role đọc được — tức chỉ đọc được từ server, đúng ý đồ.
 */

/**
 * Thẻ khách suy từ ĐƠN HÀNG THẬT trong bảng `don_hang`, gom một lượt cho cả danh sách.
 * Cố ý không đọc cờ do người bấm tay: cờ tay luôn thiếu và luôn trễ.
 * Ngưỡng VIP: từ 3 đơn hoặc từ 5 triệu — đổi cho hợp ngành của bạn nếu cần.
 */
async function theTheoSdt(): Promise<Record<string, { the: string[]; soDon: number; tong: number }>> {
  const sb = getServiceClient();
  let rows: any[] = [], off = 0;
  while (true) {
    // PostgREST chặn cứng 1000 dòng/lần và KHÔNG báo lỗi khi cắt — phải lật trang.
    const { data } = await sb.from("don_hang").select("sdt, khach_tra, ngay").range(off, off + 999);
    if (!data?.length) break;
    rows = rows.concat(data);
    if (data.length < 1000) break;
    off += 1000;
  }
  const gom: Record<string, { the: string[]; soDon: number; tong: number }> = {};
  for (const r of rows) {
    const p = chuanSdt(r.sdt);
    if (!p) continue;
    const g = (gom[p] ??= { the: [], soDon: 0, tong: 0 });
    g.soDon++;
    g.tong += Number(r.khach_tra) || 0;
  }
  for (const g of Object.values(gom)) {
    if (g.soDon >= 3 || g.tong >= 5_000_000) g.the.push("vip");
    else if (g.soDon >= 2) g.the.push("mua-lai");
    else g.the.push("da-mua");
  }
  return gom;
}

/**
 * Nick Zalo đang có trong kho, kèm người cầm nick và TÌNH TRẠNG KẾT NỐI.
 * Sức khoẻ nick đọc từ config `zalo_bridge_nick` (cầu nối ghi nhịp tim riêng từng nick)
 * — một phép đo, một chỗ ghi. Nhịp quá 20 phút thì coi như cầu đứng.
 */
export async function layNick(): Promise<HopThuNick[]> {
  const sb = getServiceClient();
  const [acc, cau] = await Promise.all([
    sb.from("zalo_bridge_accounts").select("own_id, sale_name, display_name").order("sale_name", { ascending: true }),
    sb.from("config").select("value").eq("key", "zalo_bridge_nick").maybeSingle(),
  ]);

  const sucKhoe: Record<string, { song: boolean | null; status: string | null }> = {};
  try {
    for (const [ownId, v] of Object.entries(JSON.parse(cau.data?.value || "{}") as Record<string, any>)) {
      const tuoiPhut = v?.at ? (Date.now() - Date.parse(v.at)) / 60000 : 999;
      const song = !!v?.ok && tuoiPhut <= 20;
      sucKhoe[ownId] = { song, status: song ? "đang nối" : `cầu đứng ${Math.round(tuoiPhut)} phút` };
    }
  } catch { /* chưa đo được thì để null, KHÔNG đoán là còn sống */ }

  return (acc.data || []).map((r) => ({
    ownId: r.own_id,
    sale: r.sale_name || null,
    tenZalo: r.display_name || null,
    song: sucKhoe[r.own_id]?.song ?? null,
    status: sucKhoe[r.own_id]?.status ?? null,
  }));
}

/**
 * Nick nào người này được xem — CHỐT PHÂN QUYỀN DÙNG CHUNG cho cả trang lẫn route API.
 *
 * Trả `null` = xem tất cả (quản lý). Trả mảng rỗng = không được xem gì.
 * Cố ý để MỘT hàm duy nhất: gác ở trang mà quên gác ở route là kiểu hở kinh điển — gọi
 * thẳng route là đọc được hộp thư của đồng nghiệp, mà nội dung chat là dữ liệu cá nhân
 * của khách.
 */
export async function nickChoPhep(user: NguoiDung | null): Promise<string[] | null> {
  if (!user) return [];
  if (laQuanLy(user.vai_tro)) return null;

  const ten = String(user.ho_ten || "").trim().toLowerCase();
  if (!ten) return [];
  const nick = await layNick();
  return nick.filter((n) => String(n.sale || "").trim().toLowerCase() === ten).map((n) => n.ownId);
}

/**
 * Danh sách hội thoại cho cột trái.
 *
 * `chiNick` rỗng nghĩa là xem tất cả (quản lý); truyền mảng nick để giới hạn đúng hộp thư
 * của một nhân viên — khách Zalo thuộc về NGƯỜI CẦM HỘI THOẠI, vì đồng nghiệp không mở
 * được Zalo của nhau, "chuyền" khách sang chỉ làm khách rơi vào khoảng không.
 */
export async function layDanhSachKhach(
  chiNick: string[] = [], tran = 3000, chiKieu?: "user" | "group",
): Promise<HopThuKhach[]> {
  const sb = getServiceClient();
  const nick = await layNick();
  const saleTheoNick = Object.fromEntries(nick.map((n) => [n.ownId, n.sale]));

  const COT = "own_id, zalo_uid, display_name, phone, phone_norm, last_msg_at, last_in_at, last_out_at, unreplied, msg_count"
    + ", thread_type, unread_count, last_content, last_type"
    + ", zalo_name, ngay_sinh, trang_thai, la_ban_be, nhan_sale";
  const truyVan = (chiCho: boolean, gioiHan: number) => {
    let q = sb.from("zalo_bridge_contacts").select(COT)
      .order("last_msg_at", { ascending: false, nullsFirst: false })
      .limit(gioiHan);
    if (chiCho) q = q.eq("unreplied", true);
    if (chiNick.length) q = q.in("own_id", chiNick);
    if (chiKieu) q = q.eq("thread_type", chiKieu);
    return q;
  };

  // HAI TRUY VẤN, và khách ĐANG CHỜ phải được lấy riêng.
  // Một truy vấn duy nhất xếp theo `last_msg_at` thì trần dòng cắt mất phần CŨ NHẤT — mà
  // khách chờ lâu nhất chính là phần đó. Bẫy này im lặng: màn hình vẫn đầy hội thoại nên
  // không ai thấy thiếu.
  // PostgREST chặn cứng 1000 dòng/lời gọi nên phải lật trang, không tin `.limit(3000)`
  // (nó im lặng trả 1000, không báo lỗi).
  const latTrang = async (chiCho: boolean, gioiHan: number) => {
    let ra: any[] = [];
    for (let off = 0; off < gioiHan; off += 1000) {
      const { data } = await truyVan(chiCho, Math.min(1000, gioiHan - off)).range(off, off + Math.min(1000, gioiHan - off) - 1);
      if (!data?.length) break;
      ra = ra.concat(data);
      if (data.length < 1000) break;
    }
    return { data: ra };
  };
  const [cho, moi] = await Promise.all([latTrang(true, 2000), latTrang(false, tran)]);
  const rows = ([...(cho.data || []), ...(moi.data || [])] as any[])
    .filter((r, i, a) => i === a.findIndex((x) => x.own_id === r.own_id && x.zalo_uid === r.zalo_uid))
    .sort((a, b) => String(b.last_msg_at || "").localeCompare(String(a.last_msg_at || "")));
  if (!rows.length) return [];

  const the = await theTheoSdt();

  return rows.map((r) => {
    // Hướng tin cuối: kho ghi last_in_at / last_out_at nên suy được, không cần đọc kho tin.
    const huongSuy: "in" | "out" | null = r.last_out_at && r.last_in_at
      ? (r.last_out_at >= r.last_in_at ? "out" : "in")
      : r.last_out_at ? "out" : r.last_in_at ? "in" : null;
    return {
      ownId: r.own_id,
      uid: r.zalo_uid,
      ten: r.display_name || r.phone || r.zalo_uid,
      phone: r.phone || null,
      phoneNorm: r.phone_norm || null,
      sale: saleTheoNick[r.own_id] || null,
      tinCuoiAt: r.last_msg_at || null,
      dangCho: !!r.unreplied,
      soTin: r.msg_count || 0,
      // Chỉ tính giờ chờ khi MÌNH đang nợ câu trả lời. Hội thoại đã đáp xong mà hiện
      // "chờ 30 ngày" là con số ma — loại số dễ đẻ ra một cuộc truy trách nhiệm về việc
      // không có thật.
      choGio: r.unreplied ? gioTu(r.last_in_at || r.last_msg_at) : null,
      cauCuoi: chuCuaTinCuoi(r.last_content),
      huongCuoi: huongSuy,
      laNhom: r.thread_type === "group",
      chuaDoc: Number(r.unread_count) || 0,
      the: (r.phone_norm ? the[r.phone_norm]?.the : null) as any || (r.phone_norm ? ["chua-mua"] : []),
      tenZalo: r.zalo_name || null,
      ngaySinh: r.ngay_sinh || null,
      trangThai: r.trang_thai || null,
      laBanBe: !!r.la_ban_be,
      nhanSale: Array.isArray(r.nhan_sale) ? r.nhan_sale : [],
    };
  });
}

/**
 * Dòng thời gian hoạt động của một khách — gộp đơn hàng + lượt chăm sóc.
 * Gộp từ nhiều bảng nên MỖI DÒNG PHẢI CÓ NHÃN NGUỒN: người đọc cần biết "đã gọi" là do
 * máy ghi nhận hay do người bấm nút.
 */
export async function layHoatDong(phone: string | null, tran = 12): Promise<HoatDong[]> {
  const norm = chuanSdt(phone);
  if (!norm) return [];
  const sb = getServiceClient();
  const noiDia = "0" + norm.slice(2);

  const [don, su] = await Promise.all([
    sb.from("don_hang").select("ngay, san_pham, khach_tra, sale")
      .in("sdt", [noiDia, norm]).order("ngay", { ascending: false }).limit(tran),
    sb.from("cham_soc").select("created_at, kind, channel, content, sale_name")
      .in("customer_phone", [noiDia, norm]).order("created_at", { ascending: false }).limit(tran),
  ]);

  const ds: HoatDong[] = [];
  for (const d of don.data || []) {
    const sp = Array.isArray(d.san_pham)
      ? d.san_pham.map((p: any) => (typeof p === "string" ? p : p?.ten || p?.name || "")).filter(Boolean).join(", ")
      : String(d.san_pham || "");
    ds.push({
      luc: d.ngay || null, loai: "don",
      tieuDe: `Đơn hàng ${(Number(d.khach_tra) || 0).toLocaleString("vi-VN")}đ`,
      chiTiet: sp || null, nguoi: d.sale || null,
    });
  }
  for (const e of su.data || []) {
    const loai: HoatDong["loai"] = e.kind === "call" ? "goi" : e.kind === "gift" ? "qua" : "cham";
    ds.push({
      luc: e.created_at || null, loai,
      tieuDe: e.kind === "call" ? "Gọi điện" : e.kind === "gift" ? "Tặng quà" : `Chăm sóc qua ${e.channel || "zalo"}`,
      chiTiet: e.content || null, nguoi: e.sale_name || null,
    });
  }
  return ds
    .sort((a, b) => String(b.luc || "").localeCompare(String(a.luc || "")))
    .slice(0, tran);
}

/** Toàn bộ đoạn chat của một khách, xếp từ cũ tới mới (đọc xuôi như trong Zalo). */
export async function layDoanChat(ownId: string, uid: string, tran = 200): Promise<HopThuTin[]> {
  const sb = getServiceClient();
  const [{ data }, { data: cfg }] = await Promise.all([
    sb.from("zalo_bridge_messages")
      .select("msg_id, direction, content, sent_at")
      .eq("own_id", ownId).eq("thread_id", uid)
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(tran),
    sb.from("config").select("value").eq("key", "zalo_thu_hoi").maybeSingle(),
  ]);
  // Sổ thu hồi (cầu nối ghi từ sự kiện `undo` của Zalo): khớp theo BẤT KỲ mã nào Zalo gửi kèm.
  const thuHoi = new Map<string, { luc: string; boi: string | null }>();
  try {
    for (const v of Object.values(JSON.parse(cfg?.value || "{}")) as any[]) {
      if (String(v?.own) !== String(ownId)) continue;
      for (const id of v.ids || []) thuHoi.set(String(id), { luc: v.luc, boi: v.boiTen || v.boi || null });
    }
  } catch { /* sổ hỏng thì coi như chưa có tin nào thu hồi */ }
  return (data || [])
    .map((m) => ({
      id: m.msg_id,
      huong: (m.direction === "out" ? "out" : "in") as "in" | "out",
      noiDung: String(m.content || ""),
      luc: m.sent_at || null,
      ...(laTinChoGui(m.msg_id) ? { dangGui: true } : {}),
      ...(laTinGuiLoi(m.msg_id) ? { guiLoi: true } : {}),
      ...(thuHoi.has(String(m.msg_id)) ? { thuHoi: thuHoi.get(String(m.msg_id))! } : {}),
    }))
    .reverse();
}

/**
 * Cột phải — hồ sơ khách, trục nối là SĐT chuẩn hoá 84xxx.
 * Khách chưa lộ số thì cột này trống — đó là sự thật chứ không phải lỗi (SĐT trong inbox
 * thường chỉ xuất hiện khi khách chốt đơn).
 */
export async function layHoSoKhach(phone: string | null, tenGoiY: string): Promise<HoSoKhach> {
  const nen: HoSoKhach = { ten: tenGoiY, phone: null, sale: null, soDon: 0, tongChi: 0, donGanDay: [] };
  const norm = chuanSdt(phone);
  if (!norm) return nen;

  const sb = getServiceClient();
  // don_hang.sdt có thể là số thô (0xxx) nên so bằng cả hai dạng.
  const noiDia = "0" + norm.slice(2);

  const { data } = await sb.from("don_hang").select("ngay, san_pham, khach_tra, khach, sale")
    .in("sdt", [noiDia, norm, phone as string]).order("ngay", { ascending: false }).limit(50);
  const dons = data || [];

  return {
    ten: dons[0]?.khach || tenGoiY,
    phone: noiDia,
    sale: dons[0]?.sale || null,
    soDon: dons.length,
    tongChi: dons.reduce((s, d) => s + (Number(d.khach_tra) || 0), 0),
    donGanDay: dons.slice(0, 5).map((d) => ({
      ngay: d.ngay || null,
      sanPham: Array.isArray(d.san_pham)
        ? d.san_pham.map((p: any) => (typeof p === "string" ? p : p?.ten || p?.name || "")).filter(Boolean).join(", ")
        : String(d.san_pham || ""),
      khachTra: Number(d.khach_tra) || 0,
    })),
  };
}

/**
 * Tuổi kho — trang PHẢI nói thật số cũ tới đâu.
 * Cầu nối chạy trên máy ngoài; máy tắt là kho đứng, mà nhìn từ server thì "kho đứng" và
 * "hôm nay không ai nhắn" trông giống hệt nhau.
 */
export async function layTrangThaiKho(): Promise<TrangThaiKho> {
  const sb = getServiceClient();
  const { data } = await sb.from("config").select("value").eq("key", "zalo_bridge_status").maybeSingle();
  if (!data?.value) {
    return { ok: false, at: null, note: "Cầu nối chưa chạy lượt nào", gioTre: null };
  }
  try {
    const v = JSON.parse(data.value);
    return { ok: !!v.ok, at: v.at || null, note: v.error || null, gioTre: gioTu(v.at) };
  } catch {
    return { ok: false, at: null, note: "Cờ trạng thái hỏng khuôn", gioTre: null };
  }
}

/**
 * Số liệu trang Tổng quan — dựng TỪ CÙNG danh sách mà cột trái đang hiện,
 * để con số trên trang tổng quan không bao giờ lệch với thứ người ta bấm vào xem.
 */
export async function layTongQuan(chiNick: string[] = []): Promise<TongQuanZalo> {
  const [ds, nick, nhom] = await Promise.all([
    layDanhSachKhach(chiNick, 10000), layNick(), layNhom(chiNick),
  ]);
  const le = ds.filter((k) => !k.laNhom);
  const cho = le.filter((k) => k.dangCho);

  const theoNick = nick
    .filter((n) => !chiNick.length || chiNick.includes(n.ownId))
    .map((n) => {
      const cua = le.filter((k) => k.ownId === n.ownId);
      const c = cua.filter((k) => k.dangCho);
      const lau = c.reduce((m, k) => Math.max(m, k.choGio ?? 0), 0);
      return {
        ownId: n.ownId, sale: n.sale, song: n.song, status: n.status,
        hoiThoai: cua.length,
        cho: c.length,
        choTrongTuan: c.filter((k) => (k.choGio ?? 1e9) <= 7 * 24).length,
        choQua30Ngay: c.filter((k) => (k.choGio ?? 0) > 30 * 24).length,
        lauNhatNgay: lau ? Math.round(lau / 24) : null,
      };
    })
    .sort((a, b) => b.cho - a.cho);

  // Số thành viên: cộng TỪ DANH SÁCH NHÓM ĐÃ GỘP, không đọc lại bảng chụp — đọc thẳng
  // bảng là cộng cả nhóm mình không còn ở trong, và cộng trùng nhóm cùng tên do nhiều
  // nick chụp.
  const daDo = nhom.filter((n) => n.soThanhVien != null);
  const nhomDaDo = daDo.length;
  const nhomThanhVien = nhomDaDo ? daDo.reduce((s, n) => s + (n.soThanhVien || 0), 0) : null;

  return {
    tongHoiThoai: le.length,
    soNhom: nhom.length,
    soChuaDoc: le.filter((k) => k.chuaDoc).length,
    choTrongTuan: cho.filter((k) => (k.choGio ?? 1e9) <= 7 * 24).length,
    choTatCa: cho.length,
    choQua30Ngay: cho.filter((k) => (k.choGio ?? 0) > 30 * 24).length,
    theoNick,
    nhomThanhVien,
    nhomDaDo,
  };
}

/** Khoá gộp nhóm: TÊN đã bỏ dấu, thường hoá. Xem `layNhom` để biết vì sao không dùng mã. */
const khoaNhom = (ten: string) =>
  String(ten || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Danh sách nhóm Zalo — GỘP THEO TÊN, ghép số thành viên từ bản chụp mới nhất.
 *
 * **Zalo cấp MÃ NHÓM KHÁC NHAU cho từng tài khoản với cùng một nhóm.** Hai nick cùng ở một
 * nhóm thì mỗi nick thấy một mã khác nhau, nên gộp theo mã là đếm một nhóm hai, ba lần.
 * Số thành viên cũng phải tra theo TÊN vì cùng lý do.
 */
export async function layNhom(chiNick: string[] = []): Promise<NhomZalo[]> {
  const ds = (await layDanhSachKhach(chiNick, 2000, "group")).filter((k) => k.laNhom);

  const soTv: Record<string, number> = {};
  try {
    const { data } = await getServiceClient()
      .from("zalo_group_snapshots").select("ten_nhom, so_tv, ngay")
      .order("ngay", { ascending: false }).limit(1000);
    for (const r of data || []) {
      const k = khoaNhom(r.ten_nhom);
      if (k && !(k in soTv)) soTv[k] = Number(r.so_tv) || 0;   // bản chụp mới nhất thắng
    }
  } catch { /* thiếu thì để null từng dòng */ }

  const gom: Record<string, NhomZalo & { nick: Set<string> }> = {};
  for (const k of ds) {
    const key = khoaNhom(k.ten);
    const g = (gom[key] ??= {
      ownId: k.ownId, uid: k.uid, ten: k.ten, sale: null,
      soTin: 0, tinCuoiAt: null, cauCuoi: "", soThanhVien: soTv[key] ?? null,
      nick: new Set<string>(),
    });
    if (k.sale) g.nick.add(k.sale);
    g.soTin += k.soTin;
    // Giữ bản có hoạt động mới nhất làm đại diện, để nút "Mở nhóm" vào đúng hội thoại còn sống.
    if (!g.tinCuoiAt || (k.tinCuoiAt && k.tinCuoiAt > g.tinCuoiAt)) {
      g.tinCuoiAt = k.tinCuoiAt; g.cauCuoi = k.cauCuoi; g.ownId = k.ownId; g.uid = k.uid;
    }
  }

  return Object.values(gom)
    .map(({ nick, ...g }) => ({ ...g, sale: [...nick].sort().join(", ") || null }))
    .sort((a, b) => (b.soThanhVien ?? -1) - (a.soThanhVien ?? -1));
}
