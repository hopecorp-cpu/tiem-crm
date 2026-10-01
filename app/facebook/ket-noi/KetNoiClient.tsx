"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Facebook, Check, X, RefreshCw, Link2 } from "lucide-react";
import type { FbTrang } from "@/lib/facebook";

const INPUT = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0068FF]";

export default function KetNoiClient({ trang, verifyToken }: { trang: FbTrang[]; verifyToken: string }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [vt, setVt] = useState(verifyToken);
  const [loi, setLoi] = useState("");
  const [bao, setBao] = useState("");
  const [chay, setChay] = useState(false);

  async function gui(body: any) {
    setChay(true); setLoi(""); setBao("");
    try {
      const r = await fetch("/api/fb/trang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || j?.loi) { setLoi(j?.loi || "Không xong"); return false; }
      router.refresh(); return j;
    } catch { setLoi("Mất mạng, thử lại giúp em"); return false; }
    finally { setChay(false); }
  }

  const duongWebhook = typeof window !== "undefined" ? `${window.location.origin}/api/fb/webhook` : "/api/fb/webhook";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 lg:p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <Facebook className="h-5 w-5 text-[#0068FF]" /> Nối trang Facebook
      </h1>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Phần này cần làm một lần bên Meta, không làm trong app được</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px]">
          <li>Tạo ứng dụng ở <b>developers.facebook.com</b> (loại Business), thêm sản phẩm <b>Messenger</b>.</li>
          <li>Dán <b>App Secret</b> vào biến môi trường <code className="rounded bg-white px-1">FB_APP_SECRET</code> của web rồi deploy lại.</li>
          <li>Đặt một <b>Verify Token</b> bên dưới (chuỗi gì cũng được, bạn tự nghĩ), rồi khai webhook bên Meta với đúng chuỗi đó.</li>
          <li>Lấy <b>Page Access Token</b> của trang (nên đổi sang loại dài hạn) rồi dán vào ô bên dưới.</li>
          <li>Muốn nhắn cho khách THẬT thì ứng dụng phải qua <b>App Review</b> xin quyền <code className="rounded bg-white px-1">pages_messaging</code>. Chưa duyệt thì chỉ nhắn được với tài khoản quản trị/tester của ứng dụng.</li>
        </ol>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">1. Địa chỉ webhook &amp; Verify Token</h2>
        <div className="mt-3 space-y-2">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500"><Link2 className="h-3.5 w-3.5" /> Callback URL (dán vào Meta)</p>
            <code className="block truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{duongWebhook}</code>
          </div>
          <div className="flex gap-2">
            <input value={vt} onChange={(e) => setVt(e.target.value)} placeholder="Verify Token bạn tự đặt" className={INPUT} />
            <button disabled={chay} onClick={() => gui({ verifyToken: vt })}
              className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Lưu</button>
          </div>
          {!verifyToken && <p className="text-xs text-amber-700">Chưa đặt Verify Token thì Meta không khai webhook được.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">2. Dán Page Access Token</h2>
        <p className="mt-1 text-xs text-slate-500">
          App tự hỏi Facebook xem token này của trang nào, bạn không phải gõ mã trang.
          Token lưu trong CSDL và <b>không bao giờ hiện lại</b> — chỉ thấy 4 ký tự cuối.
        </p>
        <div className="mt-3 flex gap-2">
          <input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="EAAG..." className={INPUT} />
          <button disabled={chay || !token.trim()} onClick={async () => { const j = await gui({ token }); if (j) { setToken(""); setBao(`Đã nối trang ${j.ten || j.pageId}`); } }}
            className="shrink-0 rounded-lg bg-[#0068FF] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Nối</button>
        </div>
      </section>

      {loi && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{loi}</p>}
      {bao && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{bao}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">3. Trang đã nối</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {trang.map((t) => (
            <li key={t.pageId} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${t.active ? "text-slate-800" : "text-slate-400 line-through"}`}>
                  {t.ten || t.pageId}
                </span>
                <span className="shrink-0 text-[11px] text-slate-400">token ••••{t.duoiToken}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${t.daDangKy ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {t.daDangKy ? "đang nhận tin" : "chưa bật nhận tin"}
                </span>
              </div>
              {t.loiCuoi && (
                <p className="mt-1 flex items-start gap-1.5 text-xs text-rose-600"><X className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t.loiCuoi}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button disabled={chay} onClick={() => gui({ pageId: t.pageId, kiem: true })}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700"><RefreshCw className="h-3.5 w-3.5" /> Kiểm token</button>
                {!t.daDangKy && (
                  <button disabled={chay} onClick={() => gui({ pageId: t.pageId, dangKy: true })}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white"><Check className="h-3.5 w-3.5" /> Bật nhận tin</button>
                )}
                <button disabled={chay} onClick={() => gui({ pageId: t.pageId, tat: t.active })}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100">{t.active ? "Tắt trang" : "Bật lại"}</button>
              </div>
            </li>
          ))}
          {!trang.length && <li className="py-3 text-sm text-slate-400">Chưa nối trang nào.</li>}
        </ul>
      </section>
    </div>
  );
}
