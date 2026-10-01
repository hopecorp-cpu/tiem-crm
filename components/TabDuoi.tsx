"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Users, CalendarDays, Bell } from "lucide-react";

/**
 * TAB DƯỚI cho màn điện thoại — vỏ chung của cả app, nên nằm ở `components/` chứ không
 * trong `app/zalo/`. Chỉ hiện dưới `lg`; desktop dùng sidebar `Nav`.
 *
 * Số đỏ trên tab Tin nhắn là SỐ KHÁCH CHỜ TRONG TUẦN, không phải tổng tồn đọng — con số
 * tồn nhiều tháng dán lên tab thì ai cũng thấy "99+" rồi lờ luôn.
 */
export default function TabDuoi({ soTinNhan }: { soTinNhan?: number }) {
  const duong = usePathname() || "";
  const TAB = [
    { href: "/lich", label: "Lịch hẹn", icon: CalendarDays },
    { href: "/zalo/tin-nhan", label: "Tin nhắn", icon: MessageSquare, so: soTinNhan },
    { href: "/zalo/khach-hang", label: "Khách hàng", icon: Users },
    { href: "/zalo", label: "Thông báo", icon: Bell, khop: (d: string) => d === "/zalo" },
  ];
  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {TAB.map(({ href, label, icon: Icon, so, khop }: any) => {
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
