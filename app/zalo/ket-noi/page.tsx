import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { layNick } from "@/lib/hop-thu-zalo-server";
import { ZaloThanhTren } from "../ZaloMobile";
import KetNoiClient from "./KetNoiClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kết nối Zalo | Zalo CRM" };

export default async function KetNoiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const quanLy = laQuanLy(user.vai_tro);
  const nick = await layNick();
  return (
    <div className="flex h-full flex-col">
      <ZaloThanhTren tieuDe="Kết nối Zalo" />
      <KetNoiClient quanLy={quanLy} nick={nick.map((n) => ({ ownId: n.ownId, sale: n.sale, tenZalo: n.tenZalo, song: n.song, status: n.status }))} />
    </div>
  );
}
