"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt, Plus, Search, ChevronLeft, ChevronRight, CalendarDays,
  Pencil, Trash2, X, TriangleAlert, Wallet, Users, ShoppingBag,
} from "lucide-react";
import {
  docTien, tienDep, loc, tongKet, luiThang, type DonHang,
} from "@/lib/don-hang";

const INPUT = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0068FF]";

export default function DonHangClient({
  thang, homNay, don, thangCo, loi,
}: {
  thang: string; homNay: string; don: DonHang[]; thangCo: string[]; loi: string | null;
}) {
  const router = useRouter();
  const [tim, setTim] = useState("");
  const [mo, setMo] = useState<DonHang | "moi" | null>(null);
  const [loiGhi, setLoiGhi] = useState("");
  const [chay, setChay] = useState(false);

  const hien = useMemo(() => loc(don, tim), [don, tim]);
  const tk = useMemo(() => tongKet(hien), [hien]);

  function doiThang(t: string) { router.push(`/don-hang?thang=${t}`); }

  async function gui(method: "POST" | "PATCH", body: any) {
    setChay(true); setLoiGhi("");
    try {
      const r = await fetch("/api/don-hang", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) { setLoiGhi(j?.loi || "Không lưu được"); return false; }
      setMo(null); router.refresh(); return true;
    } catch { setLoiGhi("Mất mạng, thử lại giúp em"); return false; }
    finally { setChay(false); }
  }

  async function xoa(d: DonHang) {
    if (!confirm(`Xoá đơn của ${d.khach || d.sdt} — ${tienDep(d.khachTra)}?\nKhông khôi phục lại được.`)) return;
    setChay(true); setLoiGhi("");
    try {
      const r = await fetch(`/api/don-hang?id=${encodeURIComponent(d.id)}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok || !j.ok) { setLoiGhi(j?.loi || "Không xoá được"); return; }
      setMo(null); router.refresh();
    } finally { setChay(false); }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Receipt className="h-5 w-5 text-[#0068FF]" /> Đơn hàng
        </h1>
        <button onClick={() => { setLoiGhi(""); setMo("moi"); }}
          className="flex items-center gap-1.5 rounded-lg bg-[#0068FF] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0055D4]">
          <Plus className="h-4 w-4" /> Ghi đơn
        </button>
      </div>

      {loi && (
        <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Không đọc được kho đơn: {loi}. <b>Con số dưới đây KHÔNG đáng tin</b> — đây là kho hỏng, không phải tháng không có đơn.</span>
        </p>
      )}
      {loiGhi && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{loiGhi}</p>}

      {/* ---------------------------------------------------- CHỌN THÁNG */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => doiThang(luiThang(thang, -1))} aria-label="Tháng trước"
          className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50">
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <select value={thang} onChange={(e) => doiThang(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-800 outline-none">
            {[...new Set([thang, ...thangCo])].sort().reverse().map((t) => (
              <option key={t} value={t}>Tháng {t.slice(5)}/{t.slice(0, 4)}</option>
            ))}
          </select>
        </div>
        <button onClick={() => doiThang(luiThang(thang, 1))} aria-label="Tháng sau"
          className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50">
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>

        <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={tim} onChange={(e) => setTim(e.target.value)}
            placeholder="Tìm tên khách, số điện thoại, món…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0068FF]" />
        </div>
      </div>

      {/* ------------------------------------------------------- TỔNG KẾT */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <O icon={<ShoppingBag className="h-4 w-4" />} nhan="Số đơn" so={String(tk.soDon)}
           phu={tk.soDon ? `${tk.tuLich} từ lịch · ${tk.nhapTay} ghi tay` : undefined} />
        <O icon={<Wallet className="h-4 w-4" />} nhan="Doanh thu" so={tienDep(tk.tongTien)} />
        {/* Chưa có đơn thì ghi "chưa đo được" chứ KHÔNG hiện 0 đ — 0 đọc thành bán ế. */}
        <O icon={<Receipt className="h-4 w-4" />} nhan="Giỏ trung bình"
           so={tk.giaTb === null ? "chưa đo được" : tienDep(tk.giaTb)} mo={tk.giaTb === null} />
        <O icon={<Users className="h-4 w-4" />} nhan="Số khách" so={String(tk.soKhach)} />
      </div>

      {/* --------------------------------------------------------- DANH SÁCH */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {hien.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            {tim ? "Không có đơn nào khớp ô tìm." : loi ? "Chưa đọc được dữ liệu." : "Tháng này chưa có đơn nào."}
          </p>
        ) : (
          <>
            <table className="hidden w-full text-sm sm:table">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Ngày</th>
                  <th className="px-4 py-2.5 font-semibold">Khách</th>
                  <th className="px-4 py-2.5 font-semibold">Món</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Tiền</th>
                  <th className="px-4 py-2.5 font-semibold">Người bán</th>
                  <th className="w-20 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {hien.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                      {d.ngay ? d.ngay.slice(8) + "/" + d.ngay.slice(5, 7) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900">{d.khach || "(chưa có tên)"}</div>
                      <div className="text-xs text-slate-400">{d.sdt}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {d.sanPham.join(", ") || <span className="text-slate-300">—</span>}
                      {d.tuLich && <span className="ml-2 rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">từ lịch</span>}
                      {d.ghiChu && <div className="text-xs text-slate-400">{d.ghiChu}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-slate-900">{tienDep(d.khachTra)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{d.sale || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => { setLoiGhi(""); setMo(d); }} aria-label="Sửa đơn"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* bản điện thoại */}
            <ul className="divide-y divide-slate-50 sm:hidden">
              {hien.map((d) => (
                <li key={d.id} className="flex items-start gap-3 px-4 py-3" onClick={() => { setLoiGhi(""); setMo(d); }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900">{d.khach || "(chưa có tên)"}</span>
                      {d.tuLich && <span className="shrink-0 rounded bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-700">từ lịch</span>}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {d.ngay ? `${d.ngay.slice(8)}/${d.ngay.slice(5, 7)} · ` : ""}{d.sanPham.join(", ") || d.sdt}
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold text-slate-900">{tienDep(d.khachTra)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {mo && (
        <Form
          don={mo === "moi" ? null : mo} homNay={homNay} chay={chay}
          onDong={() => setMo(null)}
          onLuu={(b) => gui(mo === "moi" ? "POST" : "PATCH", mo === "moi" ? b : { ...b, id: mo.id })}
          onXoa={mo !== "moi" && !mo.tuLich ? () => xoa(mo) : undefined}
        />
      )}
    </div>
  );
}

function O({ icon, nhan, so, phu, mo }: { icon: React.ReactNode; nhan: string; so: string; phu?: string; mo?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">{icon} {nhan}</div>
      <div className={`mt-1 text-lg font-bold ${mo ? "text-slate-400" : "text-slate-900"}`}>{so}</div>
      {phu && <div className="text-xs text-slate-400">{phu}</div>}
    </div>
  );
}

function Form({
  don, homNay, chay, onDong, onLuu, onXoa,
}: {
  don: DonHang | null; homNay: string; chay: boolean;
  onDong: () => void; onLuu: (b: any) => void; onXoa?: () => void;
}) {
  const [sdt, setSdt] = useState(don?.sdt || "");
  const [khach, setKhach] = useState(don?.khach || "");
  const [tien, setTien] = useState(don ? String(don.khachTra) : "");
  const [ngay, setNgay] = useState(don?.ngay || homNay);
  const [mon, setMon] = useState(don?.sanPham.join(", ") || "");
  const [sale, setSale] = useState(don?.sale || "");
  const [ghiChu, setGhiChu] = useState(don?.ghiChu || "");

  // In lại số đã HIỂU ngay dưới ô. Chủ tiệm gõ "350" định nói 350k thì nhìn thấy
  // "= 350 đ" là sửa ngay — thà hiện cái mình hiểu còn hơn đoán hộ rồi sai lặng lẽ.
  const hieu = docTien(tien);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onDong}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">{don ? "Sửa đơn" : "Ghi đơn"}</h2>
          <button onClick={onDong} aria-label="Đóng" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {don?.tuLich && (
          <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
            Đơn này sinh ra từ một lịch hẹn. Sửa được nội dung, nhưng không xoá được —
            muốn bỏ hẳn thì huỷ lịch hẹn tương ứng.
          </p>
        )}

        <div className="space-y-3">
          <L nhan="Số điện thoại khách *">
            <input value={sdt} onChange={(e) => setSdt(e.target.value)} inputMode="tel"
              placeholder="0901234567" className={INPUT} />
          </L>
          <L nhan="Tên khách">
            <input value={khach} onChange={(e) => setKhach(e.target.value)} placeholder="Chị Lan" className={INPUT} />
          </L>
          <L nhan="Khách trả *">
            <input value={tien} onChange={(e) => setTien(e.target.value)}
              placeholder="500k · 1tr2 · 1.500.000" className={INPUT} />
            <p className={`mt-1 text-xs ${hieu === null ? "text-rose-600" : "text-slate-500"}`}>
              {tien.trim() === "" ? "Gõ được 500k, 1tr2, hay 1.500.000."
                : hieu === null ? "Chưa đọc được số này."
                : <>= <b>{tienDep(hieu)}</b></>}
            </p>
          </L>
          <L nhan="Ngày">
            <input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} className={INPUT} />
          </L>
          <L nhan="Món / dịch vụ">
            <input value={mon} onChange={(e) => setMon(e.target.value)}
              placeholder="Sơn gel, Nối mi" className={INPUT} />
            <p className="mt-1 text-xs text-slate-400">Nhiều món thì ngăn bằng dấu phẩy.</p>
          </L>
          <L nhan="Người bán">
            <input value={sale} onChange={(e) => setSale(e.target.value)} placeholder="Thu" className={INPUT} />
          </L>
          <L nhan="Ghi chú">
            <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)}
              placeholder="Còn thiếu 100k, hẹn trả sau" className={INPUT} />
          </L>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            disabled={chay || !sdt.trim() || hieu === null}
            onClick={() => onLuu({ sdt, khach, khachTra: tien, ngay, sanPham: mon, sale, ghiChu })}
            className="flex-1 rounded-lg bg-[#0068FF] py-2.5 text-sm font-semibold text-white hover:bg-[#0055D4] disabled:opacity-40">
            {chay ? "Đang lưu…" : don ? "Lưu" : "Ghi đơn"}
          </button>
          {onXoa && (
            <button onClick={onXoa} disabled={chay} aria-label="Xoá đơn"
              className="rounded-lg border border-rose-200 p-2.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function L({ nhan, children }: { nhan: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{nhan}</span>
      {children}
    </label>
  );
}
