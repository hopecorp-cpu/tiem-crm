import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import Nav, { ThanhTop } from "@/components/Nav";
import TabDuoi from "@/components/TabDuoi";

export const dynamic = "force-dynamic";

/**
 * KHU LỊCH HẸN. Dùng CHUNG vỏ với khu Zalo (`components/Nav`) nhưng KHÔNG nhập gì
 * từ `app/zalo/` — đúng luật "mảng A cấm gọi thẳng ruột mảng B".
 * Cố ý không đếm badge tin nhắn ở đây: lịch không việc gì phải đi hỏi kho Zalo.
 */
export default async function LichLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7FA]">
      <Nav
        ten={user.ho_ten || user.email || ""}
        vaiTro={laQuanLy(user.vai_tro) ? "Quản lý" : "Nhân viên"}
        online
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ThanhTop ten={user.ho_ten || ""} />
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
        <TabDuoi />
      </div>
    </div>
  );
}
