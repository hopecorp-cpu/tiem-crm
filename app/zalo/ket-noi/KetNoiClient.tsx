"use client";

import { useEffect, useState } from "react";
import { QrCode, Loader2, CheckCircle2, AlertTriangle, WifiOff, Wifi, RefreshCw } from "lucide-react";

type Nick = { ownId: string; sale: string | null; tenZalo: string | null; song: boolean | null; status: string | null };
type TrangThai = { nick: string; buoc: string; luc: string; qr?: string | null; ten?: string | null; luot?: number } | null;

const BUOC: Record<string, string> = {
  "cho-may": "Đang chờ máy cầu nối nhận yêu cầu...",
  "dang-lay-qr": "Máy đang xin mã QR từ Zalo...",
  "cho-quet": "Mở Zalo trên điện thoại → biểu tượng QR (góc trên phải màn Tin nhắn) → quét mã này → bấm Đồng ý.",
  "da-quet": "Đã quét — bấm ĐỒNG Ý đăng nhập trên điện thoại.",
  "da-noi": "Đã nối. Cầu đang chạy, tin nhắn bắt đầu đổ về CRM.",
  "het-han": "Hết 15 phút chưa ai quét. Bấm Lấy mã QR để làm lại.",
};

/**
 * MÀN KẾT NỐI ZALO — mã QR hiện NGAY TRÊN WEB. Web đặt yêu cầu → máy cầu nối xin QR →
 * web poll 3s và vẽ. Mã QR sống ~90s, máy tự xin lại tối đa 10 lượt nên cứ để trang mở.
 * Chỉ quản lý được bấm "Lấy mã QR"; nhân viên vẫn xem được để quét.
 */
export default function KetNoiClient({ quanLy, nick }: { quanLy: boolean; nick: Nick[] }) {
  const [tenNick, setTenNick] = useState("");
  const [tt, setTt] = useState<TrangThai>(null);
  const [cauNoi, setCauNoi] = useState<{ song: boolean; at: string | null; dang: any[]; phien: string[] }>({ song: false, at: null, dang: [], phien: [] });
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState("");

  const doc = async () => {
    try {
      const j = await fetch("/api/hop-thu-zalo/ket-noi").then((r) => r.json());
      setTt(j.trangThai || null); setCauNoi(j.cauNoi || cauNoi);
    } catch { /* lượt sau */ }
  };
  useEffect(() => { doc(); const t = setInterval(doc, 3000); return () => clearInterval(t); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const layQR = async () => {
    setLoi(""); setDangGui(true);
    try {
      const r = await fetch("/api/hop-thu-zalo/ket-noi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nick: tenNick }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.loi || `Lỗi ${r.status}`);
      setTt({ nick: j.nick, buoc: "cho-may", luc: new Date().toISOString() });
    } catch (e: any) { setLoi(String(e.message || e)); } finally { setDangGui(false); }
  };

  const dangCho = tt && ["cho-may", "dang-lay-qr", "da-quet"].includes(tt.buoc);
  const tuoiTt = tt?.luc ? Math.round((Date.now() - Date.parse(tt.luc)) / 1000) : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Kết nối Zalo vào CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Mỗi nick Zalo quét mã một lần; sau đó tin nhắn, danh bạ đổ về CRM và gửi tin từ CRM đi thẳng nick đó.</p>
      </div>

      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${cauNoi.song ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        {cauNoi.song ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {cauNoi.song
          ? <>Máy cầu nối đang chạy · {cauNoi.dang.length} cầu đang sống ({cauNoi.dang.map((d: any) => d.nick).join(", ") || "chưa có"}) · phiên đã lưu: {cauNoi.phien.join(", ") || "chưa có"}</>
          : <>Máy cầu nối đang KHÔNG chạy — bật trên máy luôn mở bằng <code className="rounded bg-white/70 px-1">node scripts/zalo-cau-noi-quan-ly.mjs</code>. Không có nó thì không xin được mã QR và tin không đổ về.</>}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><QrCode className="h-4 w-4 text-[#0068FF]" /> Nối nick mới / nối lại</h2>
        {quanLy ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-600">
              Tên nick (không dấu, ví dụ <b>hotline1</b>, <b>an</b>)
              <input value={tenNick} onChange={(e) => setTenNick(e.target.value)} placeholder="hotline1"
                className="mt-1 block w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0068FF]" />
            </label>
            <button onClick={layQR} disabled={!tenNick.trim() || dangGui || !cauNoi.song}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0068FF] px-4 text-sm font-semibold text-white disabled:opacity-40">
              {dangGui ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />} Lấy mã QR
            </button>
            {loi && <span className="text-xs text-rose-600">{loi}</span>}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Chỉ quản lý mới bấm lấy mã. Nếu quản lý đã bấm, mã sẽ hiện ngay dưới đây — bạn quét bằng Zalo trên điện thoại.</p>
        )}

        {tt && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nick: {tt.nick} · {tuoiTt != null ? `${tuoiTt}s trước` : ""}</p>
            <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              {tt.buoc === "cho-quet" && tt.qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`data:image/png;base64,${tt.qr}`} alt="Mã QR đăng nhập Zalo" className="h-56 w-56 shrink-0 rounded-xl border border-slate-200 bg-white p-2" />
              ) : (
                <div className="flex h-56 w-56 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-300">
                  {dangCho ? <Loader2 className="h-8 w-8 animate-spin" /> : tt.buoc === "da-noi" ? <CheckCircle2 className="h-10 w-10 text-emerald-500" /> : <AlertTriangle className="h-8 w-8 text-amber-500" />}
                </div>
              )}
              <div className="text-sm text-slate-700">
                <p className="font-medium">{BUOC[tt.buoc] || tt.buoc}</p>
                {tt.buoc === "cho-quet" && <p className="mt-1 text-xs text-slate-500">Mã đổi mỗi ~90 giây (lượt {tt.luot || 1}/10) — cứ quét mã đang hiện. Trang tự cập nhật.</p>}
                {tt.buoc === "da-quet" && tt.ten && <p className="mt-1 text-xs text-slate-500">Điện thoại: {tt.ten}</p>}
                {tt.buoc === "da-noi" && <p className="mt-1 text-xs text-slate-500">Nhớ: Zalo chỉ cho MỘT phiên máy tính mỗi nick — đã nối vào CRM thì đừng mở Zalo PC/Web ở máy khác, mở là cầu bị đá ra.</p>}
                {tt.buoc === "het-han" && quanLy && <button onClick={layQR} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs"><RefreshCw className="h-3.5 w-3.5" /> Lấy lại mã</button>}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Zalo đang nối ({nick.length})</h2>
        <ul className="divide-y divide-slate-100">
          {nick.map((n) => (
            <li key={n.ownId} className="flex items-center gap-3 py-2 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${n.song === false ? "bg-rose-500" : n.song ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className="font-medium text-slate-800">{n.sale || "(chưa gán người cầm)"}</span>
              <span className="text-slate-500">{n.tenZalo}</span>
              <span className="ml-auto text-xs text-slate-400">{n.status || "?"}</span>
            </li>
          ))}
          {!nick.length && <li className="py-2 text-sm text-slate-500">Chưa có nick nào.</li>}
        </ul>
        <p className="mt-2 text-[11px] text-slate-400">Trạng thái đọc từ lượt đo gần nhất; nick OFF = mất kết nối (thường do đăng nhập ở thiết bị khác) → nối lại ở trên. Gán người cầm nick: điền cột sale_name trong bảng zalo_bridge_accounts khớp tên ở bảng nguoi_dung.</p>
      </section>
    </div>
  );
}
