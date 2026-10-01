import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import Nav, { ThanhTop } from "@/components/Nav";
import TabDuoi from "@/components/TabDuoi";

export const dynamic = "force-dynamic";

export default async function BotLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7FA]">
      <Nav ten={user.ho_ten || user.email || ""} vaiTro={laQuanLy(user.vai_tro) ? "Quản lý" : "Nhân viên"} online />
      <div className="flex min-w-0 flex-1 flex-col">
        <ThanhTop ten={user.ho_ten || ""} />
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
        <TabDuoi />
      </div>
    </div>
  );
}
