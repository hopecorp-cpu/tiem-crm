"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Users, UsersRound, Bell, Search, LayoutDashboard } from "lucide-react";

/**
 * KHUNG MOBILE của khu Zalo — thanh xanh trên + tab dưới. Chỉ hiện dưới `lg`; desktop dùng ZaloNav.
 * Số đỏ trên tab Tin nhắn là SỐ KHÁCH CHỜ TRONG TUẦN, không phải tổng tồn đọng — con số tồn
 * nhiều tháng dán lên tab thì ai cũng thấy "99+" rồi lờ luôn.
 */
export function ZaloThanhTren({ tieuDe, phai }: { tieuDe: string; phai?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-[#0068FF] px-4 py-3 text-white lg:hidden">
      <Search className="h-5 w-5 shrink-0 opacity-90" />
      <h1 className="flex-1 truncate text-lg font-semibold">{tieuDe}</h1>
      {phai}
    </header>
  );
}

export function ZaloTabDuoi({ soTinNhan }: { soTinNhan?: number }) {
  const duong = usePathname() || "";
  const TAB = [
    { href: "/zalo/tin-nhan", label: "Tin nhắn", icon: MessageSquare, so: soTinNhan },
    { href: "/zalo/khach-hang", label: "Khách hàng", icon: Users },
    { href: "/zalo/nhom", label: "Nhóm", icon: UsersRound },
    { href: "/zalo", label: "Thông báo", icon: Bell, khop: (d: string) => d === "/zalo" },
  ];
  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {TAB.map(({ href, label, icon: Icon, so, khop }) => {
        const dangMo = khop ? khop(duong) : duong.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] ${
              dangMo ? "text-[#0068FF]" : "text-slate-500"
            }`}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {!!so && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">
                  {so > 99 ? "99+" : so}
                </span>
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

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
