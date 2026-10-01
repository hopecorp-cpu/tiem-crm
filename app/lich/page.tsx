import { getCurrentUser } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { laQuanLy } from "@/lib/auth";
import { lichTheoNgay, layTho, layDichVu, layCaiDat, canNhac } from "@/lib/lich-server";
import { vnDateStr, congNgay } from "@/lib/chung";
import LichClient from "./LichClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lịch hẹn | Tiệm CRM" };

export default async function Page({ searchParams }: { searchParams?: { ngay?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const homNay = vnDateStr();
  const ngay = /^\d{4}-\d{2}-\d{2}$/.test(searchParams?.ngay || "") ? searchParams!.ngay! : homNay;

  const [hen, tho, dichVu, caiDat, nhac] = await Promise.all([
    lichTheoNgay(ngay).catch(() => []),
    layTho(true).catch(() => []),
    layDichVu(true).catch(() => []),
    layCaiDat(),
    canNhac().catch(() => []),
  ]);

  // 7 ngày bấm nhanh, bắt đầu từ hôm nay
  const ngayGan = Array.from({ length: 7 }, (_, i) => congNgay(homNay, i));

  return (
    <LichClient
      ngay={ngay} homNay={homNay} ngayGan={ngayGan}
      hen={hen} tho={tho} dichVu={dichVu} caiDat={caiDat} nhac={nhac}
      laQuanLy={laQuanLy(user.vai_tro)}
    />
  );
}
