"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, Users, UsersRound, Search, Smartphone, X, QrCode, FileText, LogOut,
  CalendarDays, Settings, Facebook, Bot,
} from "lucide-react";
import { getBrowserClient } from "@/lib/supabase-browser";

/**
 * VỎ CHUNG của cả app: logo · menu dọc · "Online" · người dùng ở đáy.
 * Nằm ở `components/` chứ không trong `app/zalo/` vì nay có nhiều mảng dùng (Zalo, lịch hẹn…) —
 * mảng này cấm nhập file của mảng kia, vỏ thì phải ở lõi.
 *
 * Mọi mục đều trỏ tới trang CÓ THẬT — không dựng trang trống chỉ để đủ số mục.
 */
const MENU = [
  { href: "/zalo", label: "Tổng quan", icon: LayoutDashboard, chinhXac: true },
  { href: "/lich", label: "Lịch hẹn", icon: CalendarDays, chinhXac: true },
  { href: "/zalo/khach-hang", label: "Khách hàng", icon: Users },
  { href: "/zalo/tin-nhan", label: "Tin nhắn Zalo", icon: MessageSquare, badgeKey: "tinNhan" as const },
  { href: "/facebook", label: "Tin nhắn Facebook", icon: Facebook, chinhXac: true },
  { href: "/zalo/nhom", label: "Nhóm cộng đồng", icon: UsersRound },
  { href: "/zalo/mau-tin", label: "Mẫu tin nhanh", icon: FileText },
  { href: "/bot", label: "Bot trả lời", icon: Bot },
  { href: "/lich/cai-dat", label: "Dịch vụ & thợ", icon: Settings },
  { href: "/facebook/ket-noi", label: "Nối Facebook", icon: Facebook },
  { href: "/zalo/ket-noi", label: "Kết nối Zalo", icon: QrCode },
];

export default function Nav({
  ten, vaiTro, online, badge = { tinNhan: 0, viec: 0 }, nick = [],
}: {
  ten: string; vaiTro?: string | null; online: boolean;
  /** Số đỏ trên menu. Mảng nào không có số thì bỏ trống — vỏ không ép mảng phải đếm hộ Zalo. */
  badge?: { tinNhan: number; viec: number };
  /** Zalo đang nối vào CRM — hiện ở đáy, kèm chấm xanh/đỏ theo trạng thái nick. */
  nick?: Array<{ ownId: string; sale: string | null; tenZalo: string | null; song: boolean | null }>;
}) {
  const duong = usePathname() || "";
  const router = useRouter();
  const dangXuat = async () => {
    await getBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };
  return (
    <aside className="hidden h-screen w-[13.5rem] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <Link href="/lich" className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0068FF] text-white">
          <MessageSquare className="h-5 w-5" />
        </span>
        <span className="leading-tight">
          <span className="block text-base font-bold tracking-tight text-[#0068FF]">Tiệm CRM</span>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">lịch · khách · zalo</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5">
        {MENU.map(({ href, label, icon: Icon, chinhXac, badgeKey }) => {
          const dangMo = chinhXac ? duong === href : duong.startsWith(href);
          const so = badgeKey ? badge[badgeKey] : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition ${
                dangMo ? "bg-[#EAF2FF] font-semibold text-[#0068FF]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${dangMo ? "text-[#0068FF]" : "text-slate-400"}`} />
              <span className="flex-1">{label}</span>
              {so > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {so > 99 ? "99+" : so}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-3 py-3">
        {nick.length > 0 && (
          <div className="mb-2 rounded-lg bg-slate-50 px-2.5 py-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Zalo đang nối ({nick.length})</p>
            <ul className="space-y-1">
              {nick.map((n) => (
                <li key={n.ownId} className="flex items-center gap-2 text-xs" title={n.tenZalo || n.ownId}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${n.song === false ? "bg-rose-500" : n.song ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {n.sale || n.tenZalo || n.ownId}
                    {n.sale && n.tenZalo && <span className="text-slate-400"> · {n.tenZalo}</span>}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] text-slate-400">{n.song === false ? "OFF" : n.song ? "OK" : "?"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
          <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} />
          {online ? "Online" : "Kho đang cũ"}
        </div>
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
            {ten.split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase() || "?"}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-slate-900">{ten}</span>
            <span className="block truncate text-[11px] text-slate-500">{vaiTro || ""}</span>
          </span>
          <button onClick={dangXuat} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600" title="Đăng xuất">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * Thanh trên cùng — ô tìm rộng + nút "Điện thoại": mở một KHUNG ĐIỆN THOẠI bên phải chạy
 * ĐÚNG trang đang xem qua iframe rộng 390px — bản mobile THẬT (breakpoint theo bề rộng
 * iframe nên tab dưới + thanh xanh tự bật), không phải ảnh mô phỏng.
 */
export function ThanhTop({ ten }: { ten: string }) {
  const [moDienThoai, setMoDienThoai] = useState(false);
  const duong = usePathname() || "/lich";
  const qs = useSearchParams()?.toString();
  const src = `${duong}${qs ? `?${qs}` : ""}`;
  return (<>
    <header className="hidden h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:flex">
      <form action="/zalo/khach-hang" method="get" className="relative w-full max-w-xl">
        <input
          name="q"
          placeholder="Tìm kiếm hội thoại, khách hàng, số điện thoại..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-16 text-sm outline-none focus:border-[#0068FF] focus:bg-white"
        />
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">Enter</kbd>
      </form>
      <span className="ml-auto text-xs text-slate-500">{ten}</span>
      <button
        type="button"
        onClick={() => setMoDienThoai((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${moDienThoai ? "border-[#0068FF] bg-[#EAF2FF] text-[#0068FF]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        title="Xem bản điện thoại của đúng trang này"
      >
        <Smartphone className="h-4 w-4" /> Điện thoại
      </button>
    </header>
    {moDienThoai && (
      <aside className="fixed bottom-0 right-0 top-14 z-40 hidden w-[27rem] flex-col items-center border-l border-slate-200 bg-slate-100/95 px-4 pt-3 backdrop-blur lg:flex">
        <div className="mb-2 flex w-full items-center justify-between text-xs text-slate-500">
          <span>Bản điện thoại · {duong}</span>
          <button type="button" onClick={() => setMoDienThoai(false)} className="rounded p-1 hover:bg-slate-200" title="Đóng"><X className="h-4 w-4" /></button>
        </div>
        <div className="relative h-[min(844px,calc(100vh-7rem))] w-[390px] overflow-hidden rounded-[2.5rem] border-[10px] border-slate-900 bg-white shadow-2xl">
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-900" />
          <iframe key={src} src={src} title="Bản điện thoại" className="h-full w-full border-0" />
        </div>
      </aside>
    )}
  </>);
}
