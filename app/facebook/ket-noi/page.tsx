import { redirect } from "next/navigation";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { layTrang } from "@/lib/facebook-server";
import KetNoiClient from "./KetNoiClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nối Facebook | Tiệm CRM" };

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!laQuanLy(user.vai_tro)) redirect("/facebook");
  const [trang, cfg] = await Promise.all([
    layTrang().catch(() => []),
    getServiceClient().from("config").select("value").eq("key", "fb_verify_token").maybeSingle(),
  ]);
  return <KetNoiClient trang={trang} verifyToken={cfg.data?.value || ""} />;
}
