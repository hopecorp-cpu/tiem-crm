"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Users, UsersRound, Search, LayoutDashboard } from "lucide-react";

/** Thanh xanh trên + menu ngang — RIÊNG của khu Zalo. Chỉ hiện dưới `lg`. */
export function ZaloThanhTren({ tieuDe, phai }: { tieuDe: string; phai?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-[#0068FF] px-4 py-3 text-white lg:hidden">
      <Search className="h-5 w-5 shrink-0 opacity-90" />
      <h1 className="flex-1 truncate text-lg font-semibold">{tieuDe}</h1>
      {phai}
    </header>
  );
}

/* ZaloTabDuoi đã chuyển lên `components/TabDuoi.tsx` — tab dưới là vỏ CHUNG của cả app,
   không còn riêng của khu Zalo từ khi có mảng lịch hẹn. */

/** Menu ngang cho màn nhỏ khi KHÔNG ở trang tin nhắn (tổng quan / khách / nhóm) — thay ZaloNav dọc. */
export function ZaloMenuNgang() {
  const duong = usePathname() || "";
  const M = [
    { href: "/zalo", label: "Tổng quan", icon: LayoutDashboard, khop: (d: string) => d === "/zalo" },
    { href: "/zalo/tin-nhan", label: "Tin nhắn", icon: MessageSquare },
    { href: "/zalo/khach-hang", label: "Khách hàng", icon: Users },
    { href: "/zalo/nhom", label: "Nhóm", icon: UsersRound },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1.5 lg:hidden">
      {M.map(({ href, label, icon: Icon, khop }) => {
        const dangMo = khop ? khop(duong) : duong.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              dangMo ? "bg-[#0068FF] text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </Link>
        );
      })}
    </div>
  );
}
