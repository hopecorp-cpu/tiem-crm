"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Plus, X, Check, UserX, Ban, Receipt, Bell, Copy, Phone, Clock,
} from "lucide-react";
import {
  hhmm, phutTu, phutDep, tyLeDen, tinNhacLich, choTrong, NHAN_TRANG_THAI,
  type CaiDatLich, type DichVu, type LichHen, type Tho, type TrangThai,
} from "@/lib/lich";
import { sdtDep, tienDep, ngayDep } from "@/lib/chung";

/**
 * LỊCH NGÀY — cột dọc mỗi thợ một cột, ô hẹn cao theo ĐÚNG số phút.
 * Nhìn một cái thấy ngay chỗ nào trống, chứ không phải đọc danh sách rồi tự nhẩm.
 */

const MAU_TT: Record<TrangThai, string> = {
  dat:  "border-sky-300 bg-sky-50 text-sky-900",
  den:  "border-emerald-300 bg-emerald-50 text-emerald-900",
  vang: "border-amber-300 bg-amber-50 text-amber-900",
  huy:  "border-slate-200 bg-slate-100 text-slate-400 line-through",
};
const CAO = 1.1;   // px cho mỗi phút -> 1 tiếng = 66px

export default function LichClient({
  ngay, homNay, ngayGan, hen, tho, dichVu, caiDat, nhac, laQuanLy,
}: {
  ngay: string; homNay: string; ngayGan: string[];
  hen: LichHen[]; tho: Tho[]; dichVu: DichVu[]; caiDat: CaiDatLich; nhac: LichHen[];
  laQuanLy: boolean;
}) {
  const router = useRouter();
  const [moThem, setMoThem] = useState(false);
  const [chon, setChon] = useState<LichHen | null>(null);
  const [moNhac, setMoNhac] = useState(false);
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState("");

  const tenTho = useMemo(() => Object.fromEntries(tho.map((t) => [t.id, t.ten])), [tho]);
  const thongKe = useMemo(() => tyLeDen(hen), [hen]);
  const doanhThu = useMemo(
    () => hen.filter((h) => h.trangThai === "den").reduce((s, h) => s + h.gia, 0), [hen]);

  // Lưới giờ bên trái: mỗi tiếng một vạch.
  const gioVach: number[] = [];
  for (let t = Math.floor(caiDat.gioMo / 60) * 60; t <= caiDat.gioDong; t += 60) gioVach.push(t);
  const caoTong = (caiDat.gioDong - caiDat.gioMo) * CAO;

  async function goi(body: any) {
    setDangChay(true); setLoi("");
    try {
      const r = await fetch("/api/lich/hen", {
        method: body.__them ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, __them: undefined }),
      });
      const j = await r.json();
      if (!r.ok) { setLoi(j?.loi || "Không xong"); return false; }
      router.refresh();
      return true;
    } catch { setLoi("Mất mạng hay sao ấy, thử lại giúp em"); return false; }
    finally { setDangChay(false); }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 lg:p-6">
      {/* ---------------- đầu trang ---------------- */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <CalendarDays className="h-5 w-5 text-[#0068FF]" /> Lịch hẹn
        </h1>
        <span className="text-sm text-slate-500">{ngayDep(ngay)}{ngay === homNay && " · hôm nay"}</span>
        <div className="ml-auto flex items-center gap-2">
          {nhac.length > 0 && (
            <button onClick={() => setMoNhac(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100">
              <Bell className="h-4 w-4" /> Nhắc lịch mai ({nhac.length})
            </button>
          )}
          <button onClick={() => { setLoi(""); setMoThem(true); }}
            disabled={!tho.length || !dichVu.length}
            className="flex items-center gap-1.5 rounded-lg bg-[#0068FF] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0058d8] disabled:opacity-40">
            <Plus className="h-4 w-4" /> Thêm lịch
          </button>
        </div>
      </div>

      {/* ---------------- chọn ngày ---------------- */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {ngayGan.map((d) => (
          <a key={d} href={`/lich?ngay=${d}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              d === ngay ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
            {d === homNay ? "Hôm nay" : ngayDep(d)}
          </a>
        ))}
        <input type="date" defaultValue={ngay}
          onChange={(e) => e.target.value && (window.location.href = `/lich?ngay=${e.target.value}`)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600" />
      </div>

      {/* ---------------- thẻ số ---------------- */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <The nhan="Hẹn trong ngày" so={String(hen.filter((h) => h.trangThai !== "huy").length)} />
        <The nhan="Đã đến" so={String(thongKe.den)} />
        <The nhan="Đang chờ" so={String(thongKe.cho)} />
        <The nhan="Tỷ lệ đến"
          so={thongKe.pct == null ? "chưa đo được" : `${thongKe.pct}%`}
          phu={thongKe.pct == null ? "chưa có hẹn nào tới hạn" : `${thongKe.den} đến / ${thongKe.den + thongKe.vang} tới hạn`} />
        <The nhan="Tiền từ khách đã đến" so={tienDep(doanhThu)} />
      </div>

      {/* ---------------- chưa khai thợ / dịch vụ ---------------- */}
      {(!tho.length || !dichVu.length) && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Chưa xếp được lịch vì tiệm {!tho.length && <b>chưa khai thợ nào</b>}
          {!tho.length && !dichVu.length && " và "}
          {!dichVu.length && <b>chưa khai dịch vụ nào</b>}.{" "}
          {laQuanLy
            ? <a href="/lich/cai-dat" className="font-semibold underline">Khai ở đây</a>
            : "Nhờ quản lý khai giúp ở mục Dịch vụ &amp; thợ."}
        </div>
      )}

      {/* ---------------- lưới lịch ---------------- */}
      {tho.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="flex min-w-[640px]">
            {/* cột giờ */}
            <div className="w-14 shrink-0 border-r border-slate-100 pt-10">
              <div className="relative" style={{ height: caoTong }}>
                {gioVach.map((g) => (
                  <div key={g} className="absolute left-0 right-0 -translate-y-1/2 pr-1 text-right text-[10px] text-slate-400"
                    style={{ top: (g - caiDat.gioMo) * CAO }}>{hhmm(g)}</div>
                ))}
              </div>
            </div>
            {/* cột từng thợ */}
            {tho.map((t) => {
              const cua = hen.filter((h) => h.thoId === t.id);
              return (
                <div key={t.id} className="min-w-[150px] flex-1 border-r border-slate-100 last:border-r-0">
                  <div className="flex h-10 items-center gap-1.5 border-b border-slate-100 px-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.mau }} />
                    <span className="truncate text-xs font-semibold text-slate-700">{t.ten}</span>
                    <span className="ml-auto text-[10px] text-slate-400">{cua.filter((h) => h.trangThai !== "huy").length}</span>
                  </div>
                  <div className="relative bg-slate-50/40" style={{ height: caoTong }}>
                    {gioVach.map((g) => (
                      <div key={g} className="absolute left-0 right-0 border-t border-dashed border-slate-200/80"
                        style={{ top: (g - caiDat.gioMo) * CAO }} />
                    ))}
                    {cua.map((h) => (
                      <button key={h.id} onClick={() => { setLoi(""); setChon(h); }}
                        className={`absolute left-1 right-1 overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] leading-tight hover:ring-2 hover:ring-[#0068FF]/30 ${MAU_TT[h.trangThai]}`}
                        style={{ top: (h.phutBd - caiDat.gioMo) * CAO, height: Math.max(h.phut * CAO - 2, 22) }}>
                        <span className="block truncate font-semibold">{hhmm(h.phutBd)} {h.khachTen}</span>
                        {h.phut >= 45 && <span className="block truncate opacity-75">{h.dichVuTen || ""}</span>}
                        {h.nguon === "web" && <span className="block text-[9px] opacity-60">khách tự đặt</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loi && !moThem && !chon && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{loi}</p>}

      {moThem && (
        <FormThem tho={tho} dichVu={dichVu} caiDat={caiDat} hen={hen} ngay={ngay} homNay={homNay}
          loi={loi} dangChay={dangChay} dong={() => setMoThem(false)}
          luu={async (b) => { if (await goi({ ...b, __them: true })) setMoThem(false); }} />
      )}

      {chon && (
        <ChiTiet h={chon} thoTen={tenTho[chon.thoId] || "?"} loi={loi} dangChay={dangChay}
          dong={() => setChon(null)}
          doi={async (tt) => { if (await goi({ id: chon.id, trangThai: tt })) setChon(null); }}
          xong={async () => { if (await goi({ id: chon.id, xong: true })) setChon(null); }} />
      )}

      {moNhac && (
        <BangNhac nhac={nhac} tenTho={tenTho} tenTiem={caiDat.tenTiem} dong={() => setMoNhac(false)}
          daNhac={async (ids) => { await goi({ daNhac: ids }); setMoNhac(false); }} />
      )}
    </div>
  );
}

function The({ nhan, so, phu }: { nhan: string; so: string; phu?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{nhan}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-900">{so}</p>
      {phu && <p className="text-[11px] text-slate-400">{phu}</p>}
    </div>
  );
}

function Hop({ tieuDe, dong, children }: { tieuDe: string; dong: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={dong}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
          <h2 className="flex-1 text-base font-semibold text-slate-900">{tieuDe}</h2>
          <button onClick={dong} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- THÊM LỊCH */

function FormThem({
  tho, dichVu, caiDat, hen, ngay, homNay, loi, dangChay, dong, luu,
}: {
  tho: Tho[]; dichVu: DichVu[]; caiDat: CaiDatLich; hen: LichHen[];
  ngay: string; homNay: string; loi: string; dangChay: boolean;
  dong: () => void; luu: (b: any) => void;
}) {
  const [dvId, setDvId] = useState(dichVu[0]?.id || "");
  const [thoId, setThoId] = useState(tho[0]?.id || "");
  const [gio, setGio] = useState("");
  const [khachTen, setKhachTen] = useState("");
  const [sdt, setSdt] = useState("");
  const [ghiChu, setGhiChu] = useState("");

  const dv = dichVu.find((d) => d.id === dvId) || null;
  // Giờ trống tính NGAY TRÊN MÁY KHÁCH cho nhanh; máy chủ vẫn kiểm lại và CSDL chặn lần cuối.
  const trong = useMemo(() => choTrong({
    phut: dv?.phut ?? caiDat.buoc,
    ban: hen.filter((h) => h.thoId === thoId).map((h) => ({ phutBd: h.phutBd, phut: h.phut, trangThai: h.trangThai })),
    caiDat,
    bayGio: ngay === homNay ? Math.floor((Date.now() + 7 * 3600e3) / 60000) % 1440 : null,
  }), [dv, thoId, hen, caiDat, ngay, homNay]);

  return (
    <Hop tieuDe={`Thêm lịch · ${ngayDep(ngay)}`} dong={dong}>
      <div className="space-y-3">
        <O nhan="Dịch vụ">
          <select value={dvId} onChange={(e) => { setDvId(e.target.value); setGio(""); }} className={INPUT}>
            {dichVu.map((d) => <option key={d.id} value={d.id}>{d.ten} · {phutDep(d.phut)} · {tienDep(d.gia)}</option>)}
          </select>
        </O>
        <O nhan="Thợ">
          <select value={thoId} onChange={(e) => { setThoId(e.target.value); setGio(""); }} className={INPUT}>
            {tho.map((t) => <option key={t.id} value={t.id}>{t.ten}</option>)}
          </select>
        </O>
        <O nhan={`Giờ bắt đầu${dv ? ` · xong lúc ${gio ? hhmm((phutTu(gio) || 0) + dv.phut) : "—"}` : ""}`}>
          {trong.length === 0
            ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Thợ này kín chỗ cho dịch vụ dài {phutDep(dv?.phut ?? 0)} trong ngày {ngayDep(ngay)}. Đổi thợ hoặc đổi ngày giúp em.</p>
            : <div className="flex max-h-36 flex-wrap gap-1.5 overflow-auto">
                {trong.map((t) => (
                  <button key={t} type="button" onClick={() => setGio(hhmm(t))}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${gio === hhmm(t) ? "bg-[#0068FF] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                    {hhmm(t)}
                  </button>
                ))}
              </div>}
        </O>
        <O nhan="Tên khách"><input value={khachTen} onChange={(e) => setKhachTen(e.target.value)} className={INPUT} placeholder="Chị Lan" /></O>
        <O nhan="Số điện thoại"><input value={sdt} onChange={(e) => setSdt(e.target.value)} className={INPUT} placeholder="09xx xxx xxx" inputMode="tel" /></O>
        <O nhan="Ghi chú"><input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} className={INPUT} placeholder="mẫu hoa nhí, da dị ứng…" /></O>

        {loi && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{loi}</p>}
        <button
          disabled={dangChay || !gio || !khachTen.trim() || !thoId || !dvId}
          onClick={() => luu({ ngay, phutBd: phutTu(gio), thoId, dichVuId: dvId, khachTen, sdt, ghiChu })}
          className="w-full rounded-lg bg-[#0068FF] py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {dangChay ? "Đang lưu…" : "Lưu lịch"}
        </button>
      </div>
    </Hop>
  );
}

const INPUT = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0068FF]";
function O({ nhan, children }: { nhan: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">{nhan}</span>{children}</label>;
}

/* ------------------------------------------------------------ CHI TIẾT */

function ChiTiet({
  h, thoTen, loi, dangChay, dong, doi, xong,
}: {
  h: LichHen; thoTen: string; loi: string; dangChay: boolean;
  dong: () => void; doi: (tt: TrangThai) => void; xong: () => void;
}) {
  return (
    <Hop tieuDe={h.khachTen} dong={dong}>
      <div className="space-y-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 text-slate-700">
          <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" />
            {hhmm(h.phutBd)} – {hhmm(h.phutBd + h.phut)} · {phutDep(h.phut)}</p>
          <p className="mt-1.5">{h.dichVuTen || "—"} · {tienDep(h.gia)} · thợ {thoTen}</p>
          {h.sdt && <p className="mt-1.5 flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />
            <a href={`tel:${h.sdt}`} className="text-[#0068FF]">{sdtDep(h.sdt)}</a></p>}
          {h.ghiChu && <p className="mt-1.5 text-slate-500">{h.ghiChu}</p>}
          <p className="mt-1.5 text-xs text-slate-400">
            {NHAN_TRANG_THAI[h.trangThai]}{h.nguon === "web" && " · khách tự đặt qua web"}
            {h.donHangId && " · đã ghi đơn"}
          </p>
        </div>

        {loi && <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{loi}</p>}

        <div className="grid grid-cols-2 gap-2">
          <Nut onClick={xong} disabled={dangChay || !!h.donHangId} mau="bg-emerald-600 text-white">
            <Receipt className="h-4 w-4" /> {h.donHangId ? "Đã ghi đơn" : "Đến & ghi đơn"}
          </Nut>
          <Nut onClick={() => doi("den")} disabled={dangChay} mau="border border-emerald-300 text-emerald-700">
            <Check className="h-4 w-4" /> Đã đến
          </Nut>
          <Nut onClick={() => doi("vang")} disabled={dangChay} mau="border border-amber-300 text-amber-700">
            <UserX className="h-4 w-4" /> Khách vắng
          </Nut>
          <Nut onClick={() => doi("huy")} disabled={dangChay} mau="border border-rose-300 text-rose-700">
            <Ban className="h-4 w-4" /> Huỷ lịch
          </Nut>
        </div>
        <p className="text-xs text-slate-400">
          Huỷ thì khung giờ này nhả ra cho khách khác đặt. &quot;Khách vắng&quot; thì vẫn giữ chỗ trong sổ
          để cuối tháng còn đếm được tỷ lệ khách bỏ hẹn.
        </p>
      </div>
    </Hop>
  );
}

function Nut({ onClick, disabled, mau, children }: any) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium disabled:opacity-40 ${mau}`}>
      {children}
    </button>
  );
}

/* --------------------------------------------------------- NHẮC LỊCH */

function BangNhac({
  nhac, tenTho, tenTiem, dong, daNhac,
}: {
  nhac: LichHen[]; tenTho: Record<string, string>; tenTiem: string;
  dong: () => void; daNhac: (ids: string[]) => void;
}) {
  const [daChep, setDaChep] = useState<string | null>(null);
  return (
    <Hop tieuDe={`Nhắc lịch ngày mai · ${nhac.length} khách`} dong={dong}>
      <p className="mb-3 text-xs text-slate-500">
        Bấm Chép rồi dán vào Zalo hoặc tin nhắn của khách. Nhắc xong thì bấm nút dưới cùng để
        sổ không nhắc lại lần nữa.
      </p>
      <ul className="space-y-2">
        {nhac.map((h) => {
          const tin = tinNhacLich(
            { khachTen: h.khachTen, ngay: h.ngay, phutBd: h.phutBd, dichVuTen: h.dichVuTen, thoTen: tenTho[h.thoId] },
            tenTiem);
          return (
            <li key={h.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{hhmm(h.phutBd)} · {h.khachTen}</p>
                  <p className="text-xs text-slate-500">
                    {h.dichVuTen || "—"} · {h.sdt ? sdtDep(h.sdt) : <span className="text-amber-600">chưa có số, phải gọi tay</span>}
                  </p>
                </div>
                <button onClick={() => { navigator.clipboard?.writeText(tin); setDaChep(h.id); }}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                  <Copy className="h-3.5 w-3.5" /> {daChep === h.id ? "Đã chép" : "Chép"}
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">{tin}</pre>
            </li>
          );
        })}
      </ul>
      <button onClick={() => daNhac(nhac.map((h) => h.id))}
        className="mt-3 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white">
        Đã nhắc hết {nhac.length} khách
      </button>
    </Hop>
  );
}
