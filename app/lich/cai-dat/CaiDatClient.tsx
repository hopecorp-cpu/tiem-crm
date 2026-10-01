"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings, Scissors, Users, Link2, Check } from "lucide-react";
import { hhmm, phutDep, type CaiDatLich, type DichVu, type Tho } from "@/lib/lich";
import { tienDep } from "@/lib/chung";

const MAU = ["#0EA5E9", "#F43F5E", "#10B981", "#A855F7", "#F59E0B", "#6366F1", "#EC4899", "#14B8A6"];
const INPUT = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0068FF]";

export default function CaiDatClient({ tho, dichVu, caiDat }: { tho: Tho[]; dichVu: DichVu[]; caiDat: CaiDatLich }) {
  const router = useRouter();
  const [loi, setLoi] = useState("");
  const [chay, setChay] = useState(false);
  const [chepXong, setChepXong] = useState(false);

  async function gui(body: any) {
    setChay(true); setLoi("");
    try {
      const r = await fetch("/api/lich/cai-dat", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) { setLoi(j?.loi || "Không lưu được"); return false; }
      router.refresh();
      return true;
    } catch { setLoi("Mất mạng, thử lại giúp em"); return false; }
    finally { setChay(false); }
  }

  const linkKhach = typeof window !== "undefined" ? `${window.location.origin}/dat-lich` : "/dat-lich";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 lg:p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <Settings className="h-5 w-5 text-[#0068FF]" /> Dịch vụ &amp; thợ
      </h1>
      {loi && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{loi}</p>}

      {/* ------------------------------------------------ DỊCH VỤ */}
      <Khoi icon={<Scissors className="h-4 w-4" />} tieuDe="Dịch vụ"
        mota="Thời lượng quyết định lịch xếp được bao nhiêu khách một ngày — khai đúng số phút thật, kể cả thời gian dọn chỗ.">
        <ul className="divide-y divide-slate-100">
          {dichVu.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2.5">
              <span className={`min-w-0 flex-1 truncate text-sm ${d.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{d.ten}</span>
              <span className="shrink-0 text-xs text-slate-500">{phutDep(d.phut)}</span>
              <span className="w-24 shrink-0 text-right text-xs font-medium text-slate-700">{tienDep(d.gia)}</span>
              <button onClick={() => gui({ loai: "dich-vu", id: d.id, active: !d.active })} disabled={chay}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
                {d.active ? "Tắt" : "Bật lại"}
              </button>
            </li>
          ))}
          {!dichVu.length && <li className="py-3 text-sm text-slate-400">Chưa có dịch vụ nào.</li>}
        </ul>
        <ThemDichVu chay={chay} them={(b) => gui({ loai: "dich-vu", ...b })} />
      </Khoi>

      {/* ---------------------------------------------------- THỢ */}
      <Khoi icon={<Users className="h-4 w-4" />} tieuDe="Thợ"
        mota="Thợ nghỉ việc thì TẮT, đừng xoá — lịch cũ còn trỏ vào tên họ, xoá là mất sổ.">
        <ul className="divide-y divide-slate-100">
          {tho.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: t.mau }} />
              <span className={`min-w-0 flex-1 truncate text-sm ${t.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{t.ten}</span>
              <div className="flex shrink-0 gap-1">
                {MAU.map((m) => (
                  <button key={m} title="Đổi màu trên lịch" onClick={() => gui({ loai: "tho", id: t.id, mau: m })}
                    className={`h-4 w-4 rounded-full ring-offset-1 ${t.mau === m ? "ring-2 ring-slate-400" : ""}`} style={{ background: m }} />
                ))}
              </div>
              <button onClick={() => gui({ loai: "tho", id: t.id, active: !t.active })} disabled={chay}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
                {t.active ? "Tắt" : "Bật lại"}
              </button>
            </li>
          ))}
          {!tho.length && <li className="py-3 text-sm text-slate-400">Chưa có thợ nào.</li>}
        </ul>
        <ThemTho chay={chay} them={(ten) => gui({ loai: "tho", ten, mau: MAU[tho.length % MAU.length] })} />
      </Khoi>

      {/* --------------------------------------------- GIỜ MỞ CỬA */}
      <Khoi icon={<Settings className="h-4 w-4" />} tieuDe="Giờ mở cửa & trang đặt lịch" mota="">
        <FormGio caiDat={caiDat} chay={chay} luu={(b) => gui({ loai: "cai-dat", ...b })} />
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Link2 className="h-3.5 w-3.5" /> Link cho khách tự đặt
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 text-xs text-slate-700">{linkKhach}</code>
            <button onClick={() => { navigator.clipboard?.writeText(linkKhach); setChepXong(true); }}
              className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white">
              {chepXong ? <Check className="h-3.5 w-3.5" /> : "Chép"}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Dán link này vào tiểu sử Facebook, Zalo hoặc tin nhắn. Trang này KHÔNG cần đăng nhập và
            KHÔNG hiện tên hay số của khách nào — người lạ chỉ thấy giờ còn trống.
          </p>
        </div>
      </Khoi>
    </div>
  );
}

function Khoi({ icon, tieuDe, mota, children }: any) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">{icon} {tieuDe}</h2>
      {mota && <p className="mt-1 text-xs text-slate-500">{mota}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ThemDichVu({ chay, them }: { chay: boolean; them: (b: any) => void }) {
  const [ten, setTen] = useState(""); const [phut, setPhut] = useState("60"); const [gia, setGia] = useState("");
  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
      <input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên dịch vụ" className={`${INPUT} min-w-[9rem] flex-1`} />
      <input value={phut} onChange={(e) => setPhut(e.target.value)} placeholder="phút" inputMode="numeric" className={`${INPUT} w-20`} />
      <input value={gia} onChange={(e) => setGia(e.target.value)} placeholder="giá" inputMode="numeric" className={`${INPUT} w-28`} />
      <button disabled={chay || !ten.trim()} onClick={() => { them({ ten, phut: Number(phut), gia: Number(gia || 0) }); setTen(""); setGia(""); }}
        className="flex items-center gap-1 rounded-lg bg-[#0068FF] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
        <Plus className="h-4 w-4" /> Thêm
      </button>
    </div>
  );
}

function ThemTho({ chay, them }: { chay: boolean; them: (ten: string) => void }) {
  const [ten, setTen] = useState("");
  return (
    <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
      <input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên thợ" className={`${INPUT} flex-1`} />
      <button disabled={chay || !ten.trim()} onClick={() => { them(ten); setTen(""); }}
        className="flex items-center gap-1 rounded-lg bg-[#0068FF] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
        <Plus className="h-4 w-4" /> Thêm
      </button>
    </div>
  );
}

function FormGio({ caiDat, chay, luu }: { caiDat: CaiDatLich; chay: boolean; luu: (b: any) => void }) {
  const [gioMo, setGioMo] = useState(hhmm(caiDat.gioMo));
  const [gioDong, setGioDong] = useState(hhmm(caiDat.gioDong));
  const [buoc, setBuoc] = useState(String(caiDat.buoc));
  const [tenTiem, setTenTiem] = useState(caiDat.tenTiem);
  const [choDatWeb, setChoDatWeb] = useState(caiDat.choDatWeb);
  const [toiDaNgay, setToiDaNgay] = useState(String(caiDat.toiDaNgay));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <L nhan="Mở cửa"><input type="time" value={gioMo} onChange={(e) => setGioMo(e.target.value)} className={INPUT} /></L>
        <L nhan="Đóng cửa"><input type="time" value={gioDong} onChange={(e) => setGioDong(e.target.value)} className={INPUT} /></L>
        <L nhan="Bước chia giờ"><input value={buoc} onChange={(e) => setBuoc(e.target.value)} inputMode="numeric" className={INPUT} /></L>
        <L nhan="Đặt trước tối đa (ngày)"><input value={toiDaNgay} onChange={(e) => setToiDaNgay(e.target.value)} inputMode="numeric" className={INPUT} /></L>
      </div>
      <L nhan="Tên tiệm (hiện trên trang khách đặt)"><input value={tenTiem} onChange={(e) => setTenTiem(e.target.value)} className={INPUT} /></L>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={choDatWeb} onChange={(e) => setChoDatWeb(e.target.checked)} className="h-4 w-4" />
        Cho khách tự đặt lịch qua web
      </label>
      <button disabled={chay} onClick={() => luu({ gioMo, gioDong, buoc: Number(buoc), tenTiem, choDatWeb, toiDaNgay: Number(toiDaNgay) })}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Lưu</button>
    </div>
  );
}

function L({ nhan, children }: { nhan: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">{nhan}</span>{children}</label>;
}
