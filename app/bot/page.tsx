import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { layCauHinh } from "@/lib/bot";
import { layDichVu } from "@/lib/lich-server";
import BotClient from "./BotClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bot trả lời | Tiệm CRM" };

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!laQuanLy(user.vai_tro)) redirect("/lich");
  const [ch, dv] = await Promise.all([layCauHinh(), layDichVu(true).catch(() => [])]);
  return <BotClient cauHinh={ch} soDichVu={dv.length} />;
}
