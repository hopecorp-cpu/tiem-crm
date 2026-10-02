import { getCurrentUser } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { donTheoThang, cacThangCoDon } from "@/lib/don-hang-server";
import { thangNay, type DonHang } from "@/lib/don-hang";
import { vnDateStr } from "@/lib/chung";
import DonHangClient from "./DonHangClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đơn hàng | Tiệm CRM" };

export default async function Page({ searchParams }: { searchParams?: { thang?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const homNay = vnDateStr();
  const thang = /^\d{4}-\d{2}$/.test(searchParams?.thang || "") ? searchParams!.thang! : thangNay(homNay);

  // Kho hỏng thì nói hỏng, KHÔNG nuốt thành "chưa có đơn nào".
  let don: DonHang[] = [];
  let loi: string | null = null;
  try { don = await donTheoThang(thang); }
  catch (e: any) { don = []; loi = e?.message || "Không đọc được kho đơn"; }
  const thangCo = await cacThangCoDon().catch(() => []);

  return <DonHangClient thang={thang} homNay={homNay} don={don} thangCo={thangCo} loi={loi} />;
}
