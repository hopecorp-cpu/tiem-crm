"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, Loader2 } from "lucide-react";
import { hhmm, phutDep } from "@/lib/lich";
import { tienDep, vnDateStr, congNgay, ngayDep } from "@/lib/chung";

type DV = { id: string; ten: string; phut: number; gia: number };
type Cho = { thoId: string; thoTen: string; gio: number[] };

/** Ba bước: chọn dịch vụ -> chọn ngày & giờ -> để lại tên và số. Không bắt đăng ký tài khoản. */
export default function DatLichClient({ tenTiem, toiDaNgay }: { tenTiem: string; toiDaNgay: number }) {
  const homNay = vnDateStr();
  const [dichVu, setDichVu] = useState<DV[]>([]);
  const [dvId, setDvId] = useState("");
  const [ngay, setNgay] = useState(homNay);
  const [cho, setCho] = useState<Cho[]>([]);
  const [thoId, setThoId] = useState("");
  const [gio, setGio] = useState<number | null>(null);
  const [ten, setTen] = useState("");
  const [sdt, setSdt] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [bayHoneypot, setBayHoneypot] = useState("");   // bẫy máy — người thật không thấy ô này
  const [dangTai, setDangTai] = useState(true);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState("");
  const [xong, setXong] = useState(false);

  // Nạp bảng dịch vụ + chỗ trống. Chạy lại mỗi khi đổi dịch vụ hoặc ngày.
  useEffect(() => {
    let huy = false;
    setDangTai(true); setLoi("");
    const qs = new URLSearchParams({ ngay });
    if (dvId) qs.set("dichVu", dvId);
    fetch(`/api/lich/cong-khai?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (huy) return;
        if (j?.loi) { setLoi(j.loi); return; }
        setDichVu(j.dichVu || []);
        setCho(j.cho || []);
        setThoId(""); setGio(null);
      })
      .catch(() => !huy && setLoi("Không tải được lịch, bạn thử lại giúp mình nhé"))
      .finally(() => !huy && setDangTai(false));
    return () => { huy = true; };
  }, [ngay, dvId]);

  const dv = dichVu.find((d) => d.id === dvId) || null;
  const ngayChon = Array.from({ length: Math.min(14, toiDaNgay + 1) }, (_, i) => congNgay(homNay, i));
  const conCho = cho.filter((c) => c.gio.length > 0);

  async function gui() {
    setDangGui(true); setLoi("");
    try {
      const r = await fetch("/api/lich/cong-khai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ngay, phutBd: gio, thoId, dichVuId: dvId, khachTen: ten, sdt, ghiChu, website: bayHoneypot }),
      });
      const j = await r.json();
      if (!r.ok) { setLoi(j?.loi || "Chưa đặt được"); return; }
      setXong(true);
    } catch { setLoi("Mất mạng, bạn thử lại nhé"); }
    finally { setDangGui(false); }
  }

  if (xong) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-6 w-6 text-emerald-600" />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">Đã nhận lịch của bạn</h1>
          <p className="mt-2 text-sm text-slate-600">
            {ngayDep(ngay)} lúc {gio != null ? hhmm(gio) : ""} · {dv?.ten}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Tiệm sẽ nhắn lại xác nhận. Nếu bận bạn nhắn tiệm sớm giúp để nhường chỗ cho khách khác nhé.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-[#0068FF] px-5 py-6 text-white">
        <h1 className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="h-5 w-5" /> {tenTiem}</h1>
        <p className="mt-1 text-sm text-white/80">Chọn dịch vụ và giờ bạn tiện, tiệm giữ chỗ ngay.</p>
      </header>

      <div className="mx-auto max-w-lg space-y-5 p-5">
        {/* bẫy máy — ẩn với người, chỉ máy tự điền mới dính */}
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={bayHoneypot}
          onChange={(e) => setBayHoneypot(e.target.value)} name="website"
          className="absolute left-[-9999px] h-0 w-0 opacity-0" />

        <Buoc so={1} nhan="Bạn muốn làm gì?">
          {dangTai && !dichVu.length ? <Dang /> : (
            <div className="space-y-2">
              {dichVu.map((d) => (
                <button key={d.id} onClick={() => setDvId(d.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                    dvId === d.id ? "border-[#0068FF] bg-[#EAF2FF]" : "border-slate-200 bg-white"}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{d.ten}</span>
                    <span className="block text-xs text-slate-500">{phutDep(d.phut)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-slate-700">{tienDep(d.gia)}</span>
                </button>
              ))}
              {!dichVu.length && <p className="text-sm text-slate-400">Tiệm chưa khai dịch vụ nào.</p>}
            </div>
          )}
        </Buoc>

        {dvId && (
          <Buoc so={2} nhan="Ngày nào?">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {ngayChon.map((d) => (
                <button key={d} onClick={() => setNgay(d)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium ${
                    d === ngay ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>
                  {d === homNay ? "Hôm nay" : ngayDep(d)}
                </button>
              ))}
            </div>
          </Buoc>
        )}

        {dvId && (
          <Buoc so={3} nhan="Mấy giờ?">
            {dangTai ? <Dang /> : conCho.length === 0 ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Ngày này kín chỗ cho dịch vụ {dv?.ten} rồi. Bạn thử ngày khác giúp mình nhé.
              </p>
            ) : (
              <div className="space-y-3">
                {conCho.map((c) => (
                  <div key={c.thoId}>
                    <p className="mb-1.5 text-xs font-medium text-slate-500">Thợ {c.thoTen}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.gio.map((g) => (
                        <button key={g} onClick={() => { setThoId(c.thoId); setGio(g); }}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                            thoId === c.thoId && gio === g ? "bg-[#0068FF] text-white" : "bg-white text-slate-700"}`}>
                          {hhmm(g)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Buoc>
        )}

        {gio != null && (
          <Buoc so={4} nhan="Tiệm liên hệ bạn thế nào?">
            <div className="space-y-2">
              <input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên của bạn"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0068FF]" />
              <input value={sdt} onChange={(e) => setSdt(e.target.value)} placeholder="Số điện thoại" inputMode="tel"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0068FF]" />
              <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Ghi chú (không bắt buộc)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0068FF]" />
            </div>
          </Buoc>
        )}

        {loi && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{loi}</p>}

        {gio != null && (
          <div className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white px-5 py-3">
            <p className="mb-2 text-center text-xs text-slate-500">
              {dv?.ten} · {ngayDep(ngay)} lúc {hhmm(gio)} · {tienDep(dv?.gia || 0)}
            </p>
            <button disabled={dangGui || !ten.trim() || !sdt.trim()} onClick={gui}
              className="w-full rounded-xl bg-[#0068FF] py-3 text-sm font-semibold text-white disabled:opacity-40">
              {dangGui ? "Đang gửi…" : "Đặt lịch"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Buoc({ so, nhan, children }: { so: number; nhan: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">{so}</span>
        {nhan}
      </h2>
      {children}
    </section>
  );
}

function Dang() {
  return <p className="flex items-center gap-2 py-3 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</p>;
}
