import { redirect } from "next/navigation";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { nickChoPhep, layTrangThaiKho, layNick } from "@/lib/hop-thu-zalo-server";
import Nav, { ThanhTop } from "@/components/Nav";
import TabDuoi from "@/components/TabDuoi";

export const dynamic = "force-dynamic";

/**
 * KHU ZALO CRM — app toàn màn hình: sidebar trái · thanh tìm trên · vùng nội dung.
 * Mobile: thanh xanh (từng trang tự đặt) + tab dưới.
 *
 * Gác quyền Ở ĐÂY một lần cho cả khu (chưa đăng nhập thì middleware đã đá về /login,
 * đây là lớp thứ hai). Từng trang vẫn tự lọc theo nick được phép (`nickChoPhep`).
 */
export default async function ZaloLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Số cho badge (sidebar + tab dưới): khách chờ TRONG TUẦN (không phải tổng tồn).
  // Đếm `count` head-only, KHÔNG tải cả tệp — layout bọc mọi trang trong khu.
  const duocXem = await nickChoPhep(user);
  const sb = getServiceClient();
  const moc7Ngay = new Date(Date.now() - 7 * 864e5).toISOString();
  let qCho = sb.from("zalo_bridge_contacts").select("zalo_uid", { count: "exact", head: true })
    .eq("unreplied", true).gte("last_in_at", moc7Ngay);
  if (duocXem && duocXem.length) qCho = qCho.in("own_id", duocXem);
  const [cho, viec, kho, nickHet] = await Promise.all([
    duocXem && !duocXem.length ? Promise.resolve({ count: 0 } as any) : qCho,
    sb.from("cong_viec").select("id", { count: "exact", head: true })
      .eq("assignee_id", user.id).in("status", ["todo", "doing"]),
    layTrangThaiKho(),
    layNick(),
  ]);
  // Đáy sidebar hiện "đang nối những Zalo nào" — chỉ nick người này được xem.
  const nickHien = nickHet.filter((n) => !duocXem || duocXem.includes(n.ownId));
  const badge = { tinNhan: cho?.count || 0, viec: viec?.count || 0 };
  const online = !!kho.ok && (kho.gioTre ?? 99) < 8;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7FA]">
      <Nav
        ten={user.ho_ten || user.email || ""}
        vaiTro={laQuanLy(user.vai_tro) ? "Quản lý" : "Nhân viên"}
        online={online}
        badge={badge}
        nick={nickHien.map((n) => ({ ownId: n.ownId, sale: n.sale, tenZalo: n.tenZalo, song: n.song }))}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ThanhTop ten={user.ho_ten || ""} />
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
        <TabDuoi soTinNhan={badge.tinNhan} />
      </div>
    </div>
  );
}
