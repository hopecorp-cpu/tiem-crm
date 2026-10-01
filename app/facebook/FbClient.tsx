"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Phone, Bot, UserCheck, AlertTriangle, Facebook, Loader2 } from "lucide-react";
import { cuaSo, cuaSoDep, type FbKhach, type FbTin, type FbTrang } from "@/lib/facebook";
import { sdtDep } from "@/lib/chung";

/** HỘP THƯ FACEBOOK — hai cột: danh sách hội thoại · khung chat. */
export default function FbClient({ khachDau, trang }: { khachDau: FbKhach[]; trang: FbTrang[] }) {
  const [khach, setKhach] = useState(khachDau);
  const [loc, setLoc] = useState<"cho" | "tat-ca">("tat-ca");
  const [chon, setChon] = useState<FbKhach | null>(null);
  const [tin, setTin] = useState<FbTin[]>([]);
  const [soan, setSoan] = useState("");
  const [dangTai, setDangTai] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState("");
  const duoi = useRef<HTMLDivElement>(null);

  const chuaNoi = trang.filter((t) => t.active).length === 0;

  async function nap(l = loc) {
    const r = await fetch(`/api/fb/hop-thu?loc=${l}`).then((x) => x.json()).catch(() => null);
    if (r?.khach) setKhach(r.khach);
  }
  async function moChat(k: FbKhach) {
    setChon(k); setTin([]); setLoi(""); setDangTai(true);
    const r = await fetch(`/api/fb/hop-thu?pageId=${encodeURIComponent(k.pageId)}&psid=${encodeURIComponent(k.psid)}`)
      .then((x) => x.json()).catch(() => null);
    setTin(r?.tin || []); setDangTai(false);
  }
  useEffect(() => { duoi.current?.scrollIntoView({ behavior: "smooth" }); }, [tin]);

  async function gui() {
    if (!chon || !soan.trim()) return;
    setDangGui(true); setLoi("");
    const r = await fetch("/api/fb/hop-thu", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: chon.pageId, psid: chon.psid, noiDung: soan }),
    });
    const j = await r.json();
    setDangGui(false);
    if (!r.ok) { setLoi(j?.loi || "Không gửi được"); return; }
    setSoan(""); await moChat(chon); await nap();
  }

  async function gan(hanh: any) {
    if (!chon) return;
    const r = await fetch("/api/fb/hop-thu", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: chon.pageId, psid: chon.psid, ...hanh }),
    });
    const j = await r.json();
    if (!r.ok) { setLoi(j?.loi || "Không xong"); return; }
    await nap(); if (chon) setChon({ ...chon, ...(hanh.botTat !== undefined ? { botTat: hanh.botTat } : {}), ...(hanh.sdt ? { sdt: hanh.sdt } : {}) });
  }

  if (chuaNoi) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <Facebook className="mx-auto h-10 w-10 text-slate-300" />
        <h1 className="mt-3 text-lg font-semibold text-slate-900">Chưa nối trang Facebook nào</h1>
        <p className="mt-2 text-sm text-slate-500">
          Nối trang xong thì tin nhắn khách gửi vào trang sẽ hiện ở đây, và trả lời được ngay trong app.
        </p>
        <a href="/facebook/ket-noi" className="mt-4 inline-block rounded-lg bg-[#0068FF] px-4 py-2 text-sm font-semibold text-white">
          Nối trang Facebook
        </a>
      </div>
    );
  }

  const cs = chon ? cuaSo(chon.lastInAt) : null;

  return (
    <div className="flex h-full min-h-0">
      {/* cột trái */}
      <div className={`flex w-full min-w-0 flex-col border-r border-slate-200 bg-white lg:w-80 lg:shrink-0 ${chon ? "hidden lg:flex" : "flex"}`}>
        <div className="flex gap-1 border-b border-slate-100 p-2">
          {(["tat-ca", "cho"] as const).map((l) => (
            <button key={l} onClick={() => { setLoc(l); nap(l); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${loc === l ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {l === "cho" ? "Đang chờ mình" : "Tất cả"}
            </button>
          ))}
        </div>
        <ul className="min-h-0 flex-1 overflow-auto">
          {khach.map((k) => (
            <li key={k.pageId + k.psid}>
              <button onClick={() => moChat(k)}
                className={`flex w-full items-start gap-2.5 border-b border-slate-50 px-3 py-2.5 text-left hover:bg-slate-50 ${
                  chon?.psid === k.psid ? "bg-[#EAF2FF]" : ""}`}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                  {(k.ten || "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{k.ten || "Khách Facebook"}</span>
                    {k.unreplied && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{k.lastContent || ""}</span>
                  {k.sdtNorm && <span className="block text-[10px] text-emerald-600">{sdtDep(k.sdtNorm)}</span>}
                </span>
              </button>
            </li>
          ))}
          {!khach.length && <li className="p-4 text-sm text-slate-400">Chưa có hội thoại nào.</li>}
        </ul>
      </div>

      {/* khung chat */}
      <div className={`flex min-w-0 flex-1 flex-col ${chon ? "flex" : "hidden lg:flex"}`}>
        {!chon ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Chọn một hội thoại bên trái</div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
              <button onClick={() => setChon(null)} className="text-sm text-slate-500 lg:hidden">Quay lại</button>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{chon.ten || "Khách Facebook"}</span>
              <button onClick={() => gan({ botTat: !chon.botTat })}
                title={chon.botTat ? "Trả lại cho bot" : "Mình vào tay, bot im"}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
                  chon.botTat ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>
                {chon.botTat ? <><UserCheck className="h-3.5 w-3.5" /> Mình đang trả lời</> : <><Bot className="h-3.5 w-3.5" /> Bot đang trực</>}
              </button>
              <button onClick={() => { const s = prompt("Số điện thoại của khách này:"); if (s) gan({ sdt: s }); }}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs text-slate-600">
                <Phone className="h-3.5 w-3.5" /> {chon.sdt ? sdtDep(chon.sdt) : "Gắn số"}
              </button>
            </div>

            {/* cảnh báo cửa sổ 24h — báo TRƯỚC khi gõ, không để gõ xong mới biết */}
            {cs && !cs.conMo && (
              <div className="flex items-start gap-2 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{cuaSoDep(chon.lastInAt)}. Khách phải nhắn lại thì mới gửi được; giờ thì gọi điện hoặc nhắn Zalo cho họ.</span>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-2 overflow-auto bg-[#F5F7FA] p-3">
              {dangTai && <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</p>}
              {tin.map((t) => (
                <div key={t.mid} className={`flex ${t.direction === "out" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    t.direction === "out" ? "bg-[#0068FF] text-white" : "bg-white text-slate-800"}`}>
                    {t.content}
                    {t.boi === "bot" && <span className="mt-1 block text-[10px] opacity-70">bot trả lời</span>}
                  </div>
                </div>
              ))}
              <div ref={duoi} />
            </div>

            {loi && <p className="bg-rose-50 px-3 py-2 text-sm text-rose-700">{loi}</p>}

            <div className="flex items-end gap-2 border-t border-slate-200 bg-white p-2.5">
              <textarea value={soan} onChange={(e) => setSoan(e.target.value)} rows={1}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); gui(); } }}
                placeholder={cs?.conMo ? "Nhắn cho khách…" : "Hết cửa sổ 24 giờ"}
                disabled={!cs?.conMo}
                className="max-h-32 min-h-[2.5rem] flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0068FF] disabled:bg-slate-50" />
              <button onClick={gui} disabled={dangGui || !soan.trim() || !cs?.conMo}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0068FF] text-white disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
