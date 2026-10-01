import DatLichClient from "./DatLichClient";
import { layCaiDat } from "@/lib/lich-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đặt lịch" };

/**
 * TRANG KHÁCH TỰ ĐẶT — CÔNG KHAI, không đăng nhập (đã khai trong middleware).
 *
 * Trang này CỐ Ý nằm NGOÀI `app/lich/` vì nó không dùng vỏ có sidebar của nhân viên:
 * khách vào đây chỉ được thấy đúng thứ cần để đặt chỗ, không thấy menu quản trị.
 * Mọi dữ liệu nó lấy đều qua /api/lich/cong-khai, nơi đã gác sẵn.
 */
export default async function Page() {
  const caiDat = await layCaiDat().catch(() => null);
  if (!caiDat?.choDatWeb) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Tiệm đang tạm không nhận đặt lịch online</h1>
          <p className="mt-2 text-sm text-slate-500">Bạn gọi trực tiếp cho tiệm giúp mình nhé.</p>
        </div>
      </main>
    );
  }
  return <DatLichClient tenTiem={caiDat.tenTiem} toiDaNgay={caiDat.toiDaNgay} />;
}
