import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { layDanhSachKhach, layDoanChat, layHoSoKhach, layHoatDong, layNick, layTrangThaiKho, nickChoPhep } from "@/lib/hop-thu-zalo-server";
import HopThuClient from "./HopThuClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tin nhắn | Zalo CRM" };

/** HỘP THƯ ZALO — ba cột: danh sách hội thoại · đoạn chat · hồ sơ khách. */
const khoaNhom = (ten: string) =>
  String(ten || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/\s+/g, " ").trim();

function gopNhomTheoTen<T extends { laNhom: boolean; ten: string; tinCuoiAt: string | null; soTin: number; chuaDoc: number }>(ds: T[]): T[] {
  const ra: T[] = [];
  const nhom: Record<string, T> = {};
  for (const k of ds) {
    if (!k.laNhom) { ra.push(k); continue; }
    const key = khoaNhom(k.ten);
    const co = nhom[key];
    if (!co) { nhom[key] = { ...k }; continue; }
    // Giữ bản có hoạt động mới nhất làm đại diện, cộng dồn số tin và số chưa đọc.
    const moiHon = !co.tinCuoiAt || (k.tinCuoiAt && k.tinCuoiAt > co.tinCuoiAt);
    nhom[key] = { ...(moiHon ? k : co), soTin: co.soTin + k.soTin, chuaDoc: co.chuaDoc + k.chuaDoc };
  }
  return ra.concat(Object.values(nhom));
}

export default async function HopThuZaloPage({
  searchParams,
}: {
  searchParams?: { "hoi-thoai"?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const quanLy = laQuanLy(user.vai_tro);
  const duocXem = await nickChoPhep(user);
  if (duocXem !== null && !duocXem.length) {
    // Nhân viên chưa được gán nick nào: nói thẳng lý do thay vì đưa ra một hộp thư trống,
    // vì trống và "không có quyền" trông giống hệt nhau trên màn hình.
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Hộp thư Zalo</h1>
        <p className="mt-3 max-w-xl text-sm text-slate-600">
          Tài khoản của bạn chưa được gán nick Zalo nào nên chưa có hộp thư để hiện.
          Nhờ quản lý đối chiếu tên trong bảng nguoi_dung với sale_name gắn trên nick.
        </p>
      </div>
    );
  }

  const [khachTho, nick, kho] = await Promise.all([
    layDanhSachKhach(duocXem ?? [], 10000),
    layNick(),
    layTrangThaiKho(),
  ]);
  // Gộp NHÓM theo tên: Zalo cấp mã nhóm khác nhau cho từng nick nên cùng một nhóm hiện
  // 2-3 dòng. Khách 1-1 giữ nguyên, chỉ nhóm mới phải gộp.
  const khach = gopNhomTheoTen(khachTho);

  // Liên kết thẳng `?hoi-thoai=<own>|<uid>` — trỏ thẳng vào ĐÚNG khách từ thông báo/việc.
  // Phân quyền đi qua ĐÚNG danh sách `duocXem` ở trên: người ta sửa tay tham số trên thanh
  // địa chỉ là chuyện bình thường, mở nhầm hộp thư của đồng nghiệp thì không.
  let banDau = null;
  const [own, uid] = (searchParams?.["hoi-thoai"] || "").split("|");
  if (own && uid && (duocXem === null || duocXem.includes(own))) {
    const kh = khach.find((k) => k.ownId === own && k.uid === uid);
    if (kh) {
      const [tin, hoSo, hoatDong] = await Promise.all([
        layDoanChat(own, uid), layHoSoKhach(kh.phone, kh.ten), layHoatDong(kh.phone),
      ]);
      banDau = { khach: kh, tin, hoSo, hoatDong };
    }
  }

  return (
    <HopThuClient
      khach={khach}
      nick={quanLy ? nick : nick.filter((n) => (duocXem ?? []).includes(n.ownId))}
      kho={kho}
      quanLy={quanLy}
      toi={user.ho_ten || ""}
      banDau={banDau}
    />
  );
}
