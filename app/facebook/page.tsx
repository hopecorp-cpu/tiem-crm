import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { danhSachKhach, layTrang } from "@/lib/facebook-server";
import FbClient from "./FbClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tin nhắn Facebook | Tiệm CRM" };

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [khach, trang] = await Promise.all([
    danhSachKhach("tat-ca").catch(() => []),
    layTrang().catch(() => []),
  ]);
  return <FbClient khachDau={khach} trang={trang} />;
}
