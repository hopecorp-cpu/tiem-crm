import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { ZaloThanhTren } from "../ZaloMobile";
import MauTinClient from "./MauTinClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mẫu tin nhanh | Zalo CRM" };

export default async function MauTinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex h-full flex-col">
      <ZaloThanhTren tieuDe="Mẫu tin nhanh" />
      <MauTinClient quanLy={laQuanLy(user.vai_tro)} />
    </div>
  );
}
