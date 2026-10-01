import { UserX } from "lucide-react";

/**
 * Người vào khu Zalo mà KHÔNG cầm nick nào (`nickChoPhep` trả mảng rỗng) — thường vì tên
 * trong bảng nguoi_dung lệch với sale_name gắn trên nick. Các hàm đọc kho quy ước "mảng
 * nick rỗng = xem tất cả" (cho quản lý), nên đưa thẳng mảng rỗng của họ vào là họ thấy
 * khách của CẢ ĐỘI. Trang phải chặn ở đây, không rơi về "tất cả".
 */
export default function ChuaGanNick({ ten }: { ten: string }) {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <UserX className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-3 text-base font-semibold text-slate-800">Tài khoản {ten || "này"} chưa cầm nick Zalo nào</h2>
      <p className="mt-1 text-sm text-slate-500">
        Khu Zalo chỉ hiện hội thoại của nick bạn đang cầm. Nhờ quản lý nối nick ở mục <b>Kết nối Zalo</b>,
        rồi điền cột <code className="rounded bg-slate-100 px-1">sale_name</code> của nick (bảng
        zalo_bridge_accounts) khớp với tên của bạn trong bảng nguoi_dung.
      </p>
    </div>
  );
}
