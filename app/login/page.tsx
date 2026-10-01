"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [loi, setLoi] = useState("");
  const [dangVao, setDangVao] = useState(false);

  const dangNhap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoi(""); setDangVao(true);
    try {
      const { error } = await getBrowserClient().auth.signInWithPassword({ email, password: matKhau });
      if (error) throw error;
      router.push("/zalo");
      router.refresh();
    } catch (err: any) {
      setLoi(/invalid/i.test(String(err?.message)) ? "Email hoặc mật khẩu không đúng." : String(err?.message || err));
      setDangVao(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] p-4">
      <form onSubmit={dangNhap} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0068FF] text-white">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Zalo CRM</h1>
            <p className="text-xs text-slate-500">Đăng nhập để vào hộp thư</p>
          </div>
        </div>

        <label className="block text-xs font-medium text-slate-600">
          Email
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0068FF]"
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Mật khẩu
          <input
            type="password" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} required
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0068FF]"
          />
        </label>

        {loi && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{loi}</p>}

        <button
          type="submit" disabled={dangVao || !email || !matKhau}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0068FF] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {dangVao && <Loader2 className="h-4 w-4 animate-spin" />} Đăng nhập
        </button>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Tài khoản do quản trị viên tạo — xem <code className="rounded bg-slate-100 px-1">scripts/tao-nguoi-dung.mjs</code>
        </p>
      </form>
    </main>
  );
}
