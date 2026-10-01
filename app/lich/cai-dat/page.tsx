import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { layTho, layDichVu, layCaiDat } from "@/lib/lich-server";
import CaiDatClient from "./CaiDatClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dịch vụ & thợ | Tiệm CRM" };

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Gác Ở ĐÂY chứ không chỉ ẩn mục menu — ẩn nút không phải là phân quyền.
  // Route API cũng tự gác lần nữa.
  if (!laQuanLy(user.vai_tro)) redirect("/lich");

  const [tho, dichVu, caiDat] = await Promise.all([layTho(), layDichVu(), layCaiDat()]);
  return <CaiDatClient tho={tho} dichVu={dichVu} caiDat={caiDat} />;
}
