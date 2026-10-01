import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zalo CRM",
  description: "CRM mã nguồn mở cho đội bán hàng chăm khách qua Zalo cá nhân",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
