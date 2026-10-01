"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Clock, Phone, Copy, Check, ExternalLink, AlertTriangle, Users,
  ShoppingBag, Loader2, MessageSquare, WifiOff,
  CheckSquare, PhoneCall, Send, Activity, Gift, X, Tag, Undo2, Flame, FileText,
} from "lucide-react";
import { ZaloThanhTren, ZaloMenuNgang } from "../ZaloMobile";
import {
  chuDau, doTre, gioVN, ngayVN, tienVN, NHAN_THE,
  type HopThuKhach, type HopThuNick, type HopThuTin, type HoSoKhach, type TrangThaiKho,
  type HoatDong, type TheKhach, chamDiemKhach, mucDiem,
} from "@/lib/hop-thu-zalo";

/** Ba cột: danh sách hội thoại · đoạn chat · hồ sơ khách. */

type Loc = "moi" | "tat-ca" | "dang-cho" | "cua-toi" | "chua-doc" | "nhom" | "nong";

/**
 * Ngưỡng "còn cứu được". Một con số gộp cả tồn đọng nhiều tháng không phải chỉ số điều
 * hành — đọc thẳng nó thành việc của hôm nay là sai cả hai chiều: nhân viên nhìn thấy một
 * núi không thể trèo rồi bỏ luôn, còn quản lý thì tưởng đội đang bỏ bê chừng đó khách
 * trong hôm nay. Tách theo tuổi để mỗi con số chỉ nói đúng một điều.
 */
const NGUONG_MOI = 7 * 24;
const NGUONG_CU = 30 * 24;

const khoa = (k: { ownId: string; uid: string } | null) => (k ? `${k.ownId}|${k.uid}` : "");

export default function HopThuClient({
  khach, nick, kho, quanLy, toi, banDau,
}: {
  khach: HopThuKhach[];
  nick: HopThuNick[];
  kho: TrangThaiKho;
  quanLy: boolean;
  toi: string;
  /** Hội thoại mở sẵn khi vào bằng liên kết `?hoi-thoai=<own>|<uid>` — máy chủ nạp trước
   *  đoạn chat để liên kết sâu trỏ người dùng vào ĐÚNG khách, khỏi bắt họ tự dò. */
  banDau?: { khach: HopThuKhach; tin: HopThuTin[]; hoSo: HoSoKhach; hoatDong: HoatDong[] } | null;
}) {
  const [loc, setLoc] = useState<Loc>("moi");
  const [nickLoc, setNickLoc] = useState<string>("");   // "" = tất cả nick được xem
  const [q, setQ] = useState("");
  const [chon, setChon] = useState<HopThuKhach | null>(banDau?.khach ?? null);
  const [tin, setTin] = useState<HopThuTin[]>(banDau?.tin ?? []);
  const [hoSo, setHoSo] = useState<HoSoKhach | null>(banDau?.hoSo ?? null);
  const [hoatDong, setHoatDong] = useState<HoatDong[]>(banDau?.hoatDong ?? []);
  const [oViec, setOViec] = useState(false);
  const [bao, setBao] = useState("");
  const [bangNhan, setBangNhan] = useState<{ id: number; ten: string; mau: string | null }[]>([]);
  const [moNhan, setMoNhan] = useState(false);
  const [nhanMoi, setNhanMoi] = useState("");
  const [nhanTaiCho, setNhanTaiCho] = useState<Record<string, string[]>>({});   // "own|uid" -> nhãn sau khi bấm
  // Hội thoại máy chủ đã nạp sẵn thì đừng gọi lại route — gọi lại là nháy trắng một nhịp
  // rồi vẽ lại đúng thứ vừa có.
  const daNap = useRef(khoa(banDau?.khach ?? null));
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState("");
  const [daCopy, setDaCopy] = useState("");
  const cuoiRef = useRef<HTMLDivElement>(null);

  // ── KÉO CHỈNH BỀ RỘNG CỘT. Chỉ áp từ lg (mobile một cột). Nhớ theo máy qua localStorage.
  const [rongTrai, setRongTrai] = useState(336);   // px, ~21rem
  const [rongPhai, setRongPhai] = useState(312);   // px, ~19.5rem
  const [manLon, setManLon] = useState(false);
  const keoRef = useRef<{ ben: "trai" | "phai"; x0: number; w0: number } | null>(null);
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("hopthu_cot") || "{}");
      if (c.trai >= 240) setRongTrai(c.trai); if (c.phai >= 220) setRongPhai(c.phai);
    } catch { /* để mặc định */ }
    const doMan = () => setManLon(window.innerWidth >= 1024);
    doMan(); window.addEventListener("resize", doMan);
    const keo = (e: MouseEvent) => {
      const k = keoRef.current; if (!k) return;
      const dx = e.clientX - k.x0;
      if (k.ben === "trai") setRongTrai(Math.min(560, Math.max(240, k.w0 + dx)));
      else setRongPhai(Math.min(520, Math.max(220, k.w0 - dx)));
    };
    const tha = () => {
      if (!keoRef.current) return;
      keoRef.current = null; document.body.style.cursor = ""; document.body.style.userSelect = "";
      setRongTrai((t) => { setRongPhai((p) => { try { localStorage.setItem("hopthu_cot", JSON.stringify({ trai: t, phai: p })); } catch {} return p; }); return t; });
    };
    window.addEventListener("mousemove", keo); window.addEventListener("mouseup", tha);
    return () => { window.removeEventListener("resize", doMan); window.removeEventListener("mousemove", keo); window.removeEventListener("mouseup", tha); };
  }, []);
  const batDauKeo = (ben: "trai" | "phai") => (e: React.MouseEvent) => {
    keoRef.current = { ben, x0: e.clientX, w0: ben === "trai" ? rongTrai : rongPhai };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
  };
  const ThanhKeo = ({ ben }: { ben: "trai" | "phai" }) => (
    <div
      onMouseDown={batDauKeo(ben)}
      onDoubleClick={() => (ben === "trai" ? setRongTrai(336) : setRongPhai(312))}
      title="Kéo để chỉnh bề rộng · bấm đúp để về mặc định"
      className="group absolute inset-y-0 z-20 hidden w-2 -translate-x-1/2 cursor-col-resize lg:block"
      style={ben === "trai" ? { left: rongTrai } : { right: rongPhai - 4 }}
    >
      <div className="mx-auto h-full w-px bg-transparent transition group-hover:bg-[#0068FF]/60" />
    </div>
  );

  const nickTheoId = useMemo(
    () => Object.fromEntries(nick.map((n) => [n.ownId, n])),
    [nick]
  );
  const nickChet = nick.filter((n) => n.song === false);

  // Điểm nóng — chấm tất định từ kho (lib/hop-thu-zalo.ts chamDiemKhach), tính một lần cho cả danh sách.
  const diemCua = useMemo(() => {
    const m = new Map<string, { diem: number; lyDo: string[] }>();
    for (const k of khach) m.set(`${k.ownId}|${k.uid}`, chamDiemKhach(k));
    return m;
  }, [khach]);
  const soNong = useMemo(() => khach.filter((k) => !k.laNhom && (diemCua.get(`${k.ownId}|${k.uid}`)?.diem ?? 0) >= 70).length, [khach, diemCua]);

  const hien = useMemo(() => {
    const tuKhoa = q.trim().toLowerCase();
    const ds = khach.filter((k) => {
      if (nickLoc && k.ownId !== nickLoc) return false;  // bộ lọc tài khoản
      if (loc !== "nhom" && k.laNhom) return false;      // nhóm chỉ hiện ở tab của nó
      if (loc === "nhom" && !k.laNhom) return false;
      if (loc === "dang-cho" && !k.dangCho) return false;
      if (loc === "chua-doc" && !k.chuaDoc) return false;
      if (loc === "moi" && !(k.dangCho && (k.choGio ?? 1e9) <= NGUONG_MOI)) return false;
      if (loc === "cua-toi" && String(k.sale || "").toLowerCase() !== toi.toLowerCase()) return false;
      if (loc === "nong" && (diemCua.get(`${k.ownId}|${k.uid}`)?.diem ?? 0) < 70) return false;
      if (!tuKhoa) return true;
      return `${k.ten} ${k.phone || ""} ${k.cauCuoi}`.toLowerCase().includes(tuKhoa);
    });
    // tab Nóng xếp theo điểm giảm dần — thứ tự chính là thứ tự nên gọi
    return loc === "nong" ? [...ds].sort((a, b) => (diemCua.get(`${b.ownId}|${b.uid}`)?.diem ?? 0) - (diemCua.get(`${a.ownId}|${a.uid}`)?.diem ?? 0)) : ds;
  }, [khach, loc, q, toi, diemCua, nickLoc]);

  const le = khach.filter((k) => !k.laNhom);
  const cho = le.filter((k) => k.dangCho);
  const soDangCho = cho.length;
  const soMoi = cho.filter((k) => (k.choGio ?? 1e9) <= NGUONG_MOI).length;
  const soCu = cho.filter((k) => (k.choGio ?? 0) > NGUONG_CU).length;
  const soChuaDoc = le.filter((k) => k.chuaDoc).length;
  const soNhom = khach.filter((k) => k.laNhom).length;

  // Mở một hội thoại: nạp đoạn chat + hồ sơ khách. Không nạp sẵn cả kho tin lúc vào trang.
  useEffect(() => {
    if (!chon) return;
    if (daNap.current === khoa(chon)) return;   // máy chủ đã nạp sẵn hội thoại này
    daNap.current = khoa(chon);
    let huy = false;
    setDangTai(true); setLoi(""); setTin([]); setHoSo(null); setHoatDong([]);
    const p = new URLSearchParams({ own: chon.ownId, uid: chon.uid, ten: chon.ten });
    if (chon.phone) p.set("phone", chon.phone);
    fetch(`/api/hop-thu-zalo/doan-chat?${p}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.loi || `Lỗi ${r.status}`);
        return j;
      })
      .then((j) => {
        if (huy) return;
        setTin(j.tin || []); setHoSo(j.hoSo || null); setHoatDong(j.hoatDong || []);
      })
      .catch((e) => { if (!huy) setLoi(String(e.message || e)); })
      .finally(() => { if (!huy) setDangTai(false); });
    return () => { huy = true; };
  }, [chon]);

  useEffect(() => { cuoiRef.current?.scrollIntoView({ block: "end" }); }, [tin]);

  // Bảng nhãn — tải một lần cho cả phiên.
  useEffect(() => {
    fetch("/api/hop-thu-zalo/nhan").then((r) => r.json()).then((j) => setBangNhan(j?.nhan || [])).catch(() => {});
  }, []);

  /** Gắn/gỡ một nhãn cho hội thoại đang mở. */
  const doiNhan = async (ten: string, bat: boolean) => {
    if (!chon) return;
    const key = khoa(chon);
    const hienTai = nhanTaiCho[key] ?? chon.nhanSale;
    // Cập nhật lạc quan để nút phản hồi tức thì; lỗi thì trả lại.
    setNhanTaiCho((m) => ({ ...m, [key]: bat ? [...hienTai, ten] : hienTai.filter((x) => x !== ten) }));
    try {
      const r = await fetch("/api/hop-thu-zalo/nhan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ own: chon.ownId, uid: chon.uid, ten, bat }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.loi || `Lỗi ${r.status}`);
      setNhanTaiCho((m) => ({ ...m, [key]: j.nhan || [] }));
      setBao(bat ? `Đã gắn "${ten}"` : `Đã gỡ "${ten}"`);
      if (bat && !bangNhan.some((n) => n.ten.toLowerCase() === ten.toLowerCase())) {
        fetch("/api/hop-thu-zalo/nhan").then((r) => r.json()).then((j2) => setBangNhan(j2?.nhan || [])).catch(() => {});
      }
    } catch (e: any) {
      setNhanTaiCho((m) => ({ ...m, [key]: hienTai }));
      setBao("Không đổi được nhãn: " + String(e.message || e));
    }
    setTimeout(() => setBao(""), 3000);
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setDaCopy(key);
      setTimeout(() => setDaCopy(""), 2000);
    } catch { /* trình duyệt chặn thì người dùng bôi đen chép tay */ }
  };

  const cauKhachHoi = [...tin].reverse().find((t) => t.huong === "in")?.noiDung || "";

  // ── GỬI TIN TỪ APP — route /gui gác cửa từ cấm; tin hiện ngay với cờ "đang gửi",
  // cầu nối zca-js gửi thật rồi đổi cờ. Enter = gửi, Shift+Enter = xuống dòng.
  const [soan, setSoan] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [loiGui, setLoiGui] = useState("");
  const guiTin = async () => {
    if (!chon || !soan.trim() || dangGui) return;
    const noiDung = soan.trim();
    setDangGui(true); setLoiGui("");
    try {
      const r = await fetch("/api/hop-thu-zalo/gui", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ own: chon.ownId, uid: chon.uid, noiDung }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.loi || `Lỗi ${r.status}`);
      setTin((cu) => [...cu, { id: j.id, huong: "out", noiDung, luc: j.luc, dangGui: true }]);
      setSoan("");
    } catch (e: any) {
      setLoiGui(String(e.message || e));
    } finally { setDangGui(false); }
  };
  const nickDangOff = !!chon && nickTheoId[chon.ownId]?.song === false;

  // ── MẪU TIN NHANH — chèn vào ô soạn, KHÔNG tự gửi.
  const [mauTin, setMauTin] = useState<{ id: string; ten: string; noiDung: string; nhom: string }[]>([]);
  const [moMau, setMoMau] = useState(false);
  useEffect(() => { fetch("/api/hop-thu-zalo/mau-tin").then((r) => r.json()).then((j) => setMauTin(j?.mau || [])).catch(() => {}); }, []);
  const tenGoi = (t: string) => { const p = String(t || "").replace(/\d[\d .-]{7,}/g, "").trim().split(/\s+/); return p[p.length - 1] || "bạn"; };
  const chenVaoOSoan = (txt: string) => {
    const t = txt.replace(/\{ten\}/g, chon ? tenGoi(chon.ten) : "bạn");
    setSoan((cu) => (cu.trim() ? cu + "\n" + t : t)); setMoMau(false);
  };
  const diemChon = chon ? chamDiemKhach(chon) : null;

  /** Gọi hành động nhanh. Báo kết quả THẬT — thất bại thì nói thất bại, không im lặng cho qua. */
  const hanhDong = async (than: Record<string, unknown>, khiXong: string) => {
    if (!chon) return;
    setBao("...");
    try {
      const r = await fetch("/api/hop-thu-zalo/hanh-dong", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ own: chon.ownId, uid: chon.uid, ten: chon.ten, phone: chon.phone, sale: chon.sale, ...than }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.loi || `Lỗi ${r.status}`);
      setBao(khiXong);
      if (than.viec === "ghi-cham") {
        setHoatDong((cu) => [{
          luc: new Date().toISOString(), loai: than.kieu === "call" ? "goi" : "cham",
          tieuDe: than.kieu === "call" ? "Gọi điện" : "Chăm sóc qua zalo",
          chiTiet: (than.ghiChu as string) || null, nguoi: toi,
        }, ...cu]);
      }
    } catch (e: any) {
      setBao("Không ghi được: " + String(e.message || e));
    }
    setTimeout(() => setBao(""), 4000);
  };

  return (
    <div className="flex h-full flex-col">
      {!chon && <ZaloThanhTren tieuDe="Tin nhắn" />}
      {!chon && <ZaloMenuNgang />}
      {/* Thanh trên — nói thật tuổi kho, không vẽ vẻ tươi */}
      <div className="hidden items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-white px-4 py-1.5 text-[11px] lg:flex">
        <span className="text-slate-500">
          {khach.length} hội thoại · <span className="font-medium text-rose-600">{soMoi} cần trả lời trong tuần</span>
          {" · "}{soDangCho} đang chờ tính cả tồn đọng{soCu > 0 ? ` (${soCu} người đã quá 30 ngày)` : ""}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            kho.ok && (kho.gioTre ?? 99) < 6
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
          title={kho.note || ""}
        >
          <Clock className="h-3.5 w-3.5" />
          {kho.at ? `Kho cập nhật ${doTre(kho.gioTre)} trước` : "Cầu nối chưa chạy lượt nào"}
        </span>
        {nickChet.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
            <WifiOff className="h-3.5 w-3.5" />
            {nickChet.length} nick mất kết nối: {nickChet.map((n) => n.sale || n.ownId).join(", ")}
          </span>
        )}
      </div>

      <div
        className="relative grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[21rem_minmax(0,1fr)_19.5rem]"
        style={manLon ? { gridTemplateColumns: `${rongTrai}px minmax(0,1fr) ${rongPhai}px` } : undefined}
      >
        <ThanhKeo ben="trai" />
        <ThanhKeo ben="phai" />
        {/* ── CỘT TRÁI — danh sách hội thoại ─────────────────────────────── */}
        <aside className={`flex min-h-0 flex-col border-r border-slate-200 bg-white ${chon ? "hidden lg:flex" : "flex"}`}>
          <div className="hidden items-center justify-between gap-2 px-4 pt-4 lg:flex">
            <h2 className="text-lg font-bold text-slate-900">Tin nhắn</h2>
            {nick.length > 1 && (
              <select value={nickLoc} onChange={(e) => setNickLoc(e.target.value)} title="Lọc theo tài khoản Zalo"
                className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-[#0068FF]">
                <option value="">Tất cả tài khoản ({nick.length})</option>
                {nick.map((n) => (
                  <option key={n.ownId} value={n.ownId}>{n.song === false ? "(OFF) " : ""}{n.tenZalo || n.sale || n.ownId}{n.sale && n.tenZalo ? ` · ${n.sale}` : ""}</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2 border-b border-slate-100 p-3">
            {nick.length > 1 && (
              <select value={nickLoc} onChange={(e) => setNickLoc(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 lg:hidden">
                <option value="">Tất cả tài khoản ({nick.length})</option>
                {nick.map((n) => <option key={n.ownId} value={n.ownId}>{n.song === false ? "(OFF) " : ""}{n.tenZalo || n.sale || n.ownId}</option>)}
              </select>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm kiếm trong tin nhắn"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-slate-300 focus:bg-white"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {/* Thứ tự tab theo đúng app Zalo: Tất cả · Chưa đọc · Cá nhân · Nhóm — rồi mới tới
                  hai bộ lọc theo tuổi (Trong tuần / Cả tồn), vì đó là thứ Zalo không có mà CRM cần. */}
              {([
                ["tat-ca", `Tất cả (${le.length})`],
                ...(soNong ? [["nong", `Nóng (${soNong})`] as const] : []),
                ...(soChuaDoc ? [["chua-doc", `Chưa đọc (${soChuaDoc})`] as const] : []),
                ...(quanLy ? [] : [["cua-toi", "Cá nhân"] as const]),
                ...(soNhom ? [["nhom", `Nhóm (${soNhom})`] as const] : []),
                ["moi", `Chờ trong tuần (${soMoi})`],
                ["dang-cho", `Cả tồn (${soDangCho})`],
              ] as const).map(([k, nhan]) => (
                <button
                  key={k}
                  onClick={() => setLoc(k as Loc)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    loc === k ? "bg-[#0068FF] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {nhan}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {hien.length === 0 && (
              <p className="p-4 text-sm text-slate-500">Không có hội thoại nào khớp bộ lọc.</p>
            )}
            {hien.map((k) => {
              const n = nickTheoId[k.ownId];
              const dangChon = chon?.ownId === k.ownId && chon?.uid === k.uid;
              return (
                <button
                  key={`${k.ownId}|${k.uid}`}
                  onClick={() => setChon(k)}
                  className={`flex w-full gap-2.5 border-b border-slate-50 p-3 text-left transition hover:bg-slate-50 ${
                    dangChon ? "bg-[#EAF2FF] hover:bg-[#EAF2FF]" : ""
                  }`}
                >
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    k.laNhom ? "bg-indigo-100 text-indigo-700" : "bg-[#DCEBFF] text-[#0068FF]"
                  }`}>
                    {k.laNhom ? <Users className="h-4 w-4" /> : chuDau(k.ten)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">{k.ten}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">{doTre(k.choGio ?? null) || ""}</span>
                        {k.chuaDoc > 0 && (
                          <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                            {k.chuaDoc > 99 ? "99+" : k.chuaDoc}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                      {k.huongCuoi === "out" && <span className="text-slate-400">Mình:</span>}
                      <span className="truncate">{k.cauCuoi || "(chưa có nội dung)"}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1">
                      {(() => { const d = diemCua.get(`${k.ownId}|${k.uid}`); const mu = d ? mucDiem(d.diem) : "nguoi";
                        return d && !k.laNhom && mu !== "nguoi" ? (
                          <span title={d.lyDo.join(" · ")} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${mu === "nong" ? "bg-orange-100 text-orange-700" : "bg-amber-50 text-amber-700"}`}>
                            <Flame className="h-2.5 w-2.5" /> {d.diem}
                          </span>) : null; })()}
                      {k.dangCho && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Đang chờ</span>
                      )}
                      {k.the.map((t) => (
                        <span key={t} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${NHAN_THE[t as TheKhach]?.lop || ""}`}>
                          {NHAN_THE[t as TheKhach]?.chu || t}
                        </span>
                      ))}
                      {k.nhanSale.slice(0, 2).map((t) => (
                        <span key={t} className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{t}</span>
                      ))}
                      {n?.song === false && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Nick OFF</span>
                      )}
                      {quanLy && k.sale && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{k.sale}</span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── CỘT GIỮA — đoạn chat ───────────────────────────────────────── */}
        <section className={`flex min-h-0 flex-col bg-white ${chon ? "flex" : "hidden lg:flex"}`}>
          {!chon ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <MessageSquare className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Chọn một hội thoại bên trái để đọc.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-blue-100 bg-[#F3F8FF] p-3">
                <button onClick={() => setChon(null)} className="text-sm text-slate-500 lg:hidden">Quay lại</button>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0068FF] text-xs font-semibold text-white">
                  {chuDau(chon.ten)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{chon.ten}</p>
                  <p className="truncate text-xs text-slate-500">
                    {chon.phone || "chưa có số"}
                    {chon.sale ? ` · nick ${chon.sale}` : ""}
                    {chon.dangCho && chon.choGio != null ? ` · khách chờ ${doTre(chon.choGio)}` : ""}
                  </p>
                </div>
                {diemChon && !chon.laNhom && (
                  <span title={diemChon.lyDo.join(" · ") || "chưa có tín hiệu"} className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${mucDiem(diemChon.diem) === "nong" ? "bg-orange-100 text-orange-700" : mucDiem(diemChon.diem) === "am" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                    <Flame className="h-3.5 w-3.5" /> {diemChon.diem} điểm
                  </span>
                )}
                {nickTheoId[chon.ownId]?.song === false && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Nick mất kết nối
                  </span>
                )}
              </header>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
                {dangTai && (
                  <p className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang tải đoạn chat...
                  </p>
                )}
                {loi && (
                  <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Không tải được đoạn chat: {loi}</p>
                )}
                {!dangTai && !loi && tin.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Kho chưa có tin của hội thoại này — cầu nối chỉ ghi được tin từ lúc nó chạy trở đi.
                  </p>
                )}
                {tin.map((t, i) => {
                  const ngayNay = ngayVN(t.luc);
                  const ngayTruoc = i > 0 ? ngayVN(tin[i - 1].luc) : "";
                  return (
                    <div key={t.id}>
                      {ngayNay && ngayNay !== ngayTruoc && (
                        <p className="my-3 text-center text-[11px] font-medium text-slate-400">{ngayNay}</p>
                      )}
                      <div className={`flex ${t.huong === "out" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm sm:max-w-[70%] ${
                            t.huong === "out"
                              ? "rounded-br-sm bg-[#DCEBFF] text-slate-900"
                              : "rounded-bl-sm bg-white text-slate-800 shadow-sm"
                          } ${t.thuHoi ? "border border-dashed border-rose-300" : ""}`}
                        >
                          {t.thuHoi && (
                            <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-rose-600" title={`${t.thuHoi.boi || "Người gửi"} đã thu hồi lúc ${gioVN(t.thuHoi.luc)} — kho vẫn giữ nội dung gốc`}>
                              <Undo2 className="h-3 w-3" /> Đã thu hồi {gioVN(t.thuHoi.luc)}{t.thuHoi.boi ? ` · ${t.thuHoi.boi}` : ""} — nội dung gốc:
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{t.noiDung}</p>
                          <p className={`mt-1 flex items-center gap-1 text-[10px] ${t.huong === "out" ? "text-[#0068FF]/70" : "text-slate-400"}`}>
                            {gioVN(t.luc)}
                            {t.dangGui && <span className="inline-flex items-center gap-0.5 text-slate-500" title="Đang chờ cầu nối gửi"><Clock className="h-3 w-3" /> đang gửi</span>}
                            {t.guiLoi && <span className="inline-flex items-center gap-0.5 text-rose-600" title="Gửi hỏng — gửi tay trong Zalo"><AlertTriangle className="h-3 w-3" /> gửi hỏng</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={cuoiRef} />
              </div>

              {/* Chân khung — Ô GỬI. Mọi tin đi qua /api/hop-thu-zalo/gui = cửa từ cấm.
                  Nick đang OFF thì vẫn cho gõ (tin xếp hàng, nick sống lại là đi) nhưng nói rõ. */}
              <footer className="border-t border-slate-100 p-2.5">
                {/* Bảng nhãn NGAY TRONG khung chat (mobile không có cột phải) */}
                {moNhan && (
                  <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-2 lg:hidden">
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Gắn nhãn cho {chon.ten}</p>
                    <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                      {bangNhan.map((n) => {
                        const co = (nhanTaiCho[khoa(chon)] ?? chon.nhanSale).includes(n.ten);
                        return (
                          <button key={n.id} onClick={() => doiNhan(n.ten, !co)}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium shadow-sm ${co ? "bg-violet-600 text-white" : "border border-white bg-white text-slate-700"}`}
                            style={!co && n.mau ? { borderLeft: `3px solid ${n.mau}` } : undefined}>
                            {n.ten}{co ? " ×" : ""}
                          </button>
                        );
                      })}
                    </div>
                    <form className="mt-1.5 flex gap-1" onSubmit={(e) => { e.preventDefault(); const t = nhanMoi.trim(); if (t) { doiNhan(t, true); setNhanMoi(""); } }}>
                      <input value={nhanMoi} onChange={(e) => setNhanMoi(e.target.value)} placeholder="Tạo nhãn mới rồi gắn..." maxLength={40}
                        className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-[#0068FF]" />
                      <button type="submit" disabled={!nhanMoi.trim()} className="rounded bg-[#0068FF] px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40">+ Nhãn</button>
                    </form>
                  </div>
                )}
                {moMau && (
                  <div className="mb-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Mẫu tin nhanh — bấm để chèn ({mauTin.length}) · quản lý sửa ở mục Mẫu tin nhanh</p>
                    {!mauTin.length && <p className="text-xs text-slate-500">Chưa có mẫu nào.</p>}
                    <div className="space-y-1">
                      {mauTin.map((m) => (
                        <button key={m.id} type="button" onClick={() => chenVaoOSoan(m.noiDung)} className="block w-full rounded-md border border-white bg-white px-2 py-1.5 text-left shadow-sm hover:border-[#0068FF]">
                          <span className="block text-xs font-semibold text-slate-800">{m.ten} <span className="font-normal text-slate-400">· {m.nhom}</span></span>
                          <span className="block truncate text-[11px] text-slate-500">{m.noiDung}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {loiGui && <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{loiGui}</p>}
                {nickDangOff && !loiGui && (
                  <p className="mb-2 text-[11px] text-amber-700">Nick này đang mất kết nối — tin sẽ nằm chờ, nick nối lại là gửi.</p>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex shrink-0 items-center gap-0.5 pb-1.5 text-slate-400">
                    {/* mobile: chỉ giữ nút nhãn cho ô gõ đủ rộng; desktop đủ chỗ hiện cả bốn */}
                    <button type="button" onClick={() => setMoNhan((v) => !v)} className="rounded p-1.5 hover:bg-slate-100 hover:text-[#0068FF]" title="Gắn nhãn cho khách này"><Tag className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setMoMau((v) => !v)} className={`rounded p-1.5 hover:bg-slate-100 hover:text-[#0068FF] ${moMau ? "text-[#0068FF]" : ""}`} title="Mẫu tin nhanh — chèn vào ô soạn"><FileText className="h-4 w-4" /></button>
                    <button type="button" onClick={() => copy(cauKhachHoi, "cau")} disabled={!cauKhachHoi} className="hidden rounded p-1.5 hover:bg-slate-100 hover:text-[#0068FF] disabled:opacity-30 lg:block" title="Chép câu khách hỏi">
                      {daCopy === "cau" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    {chon.phone && (
                      <button type="button" onClick={() => copy(chon.phone!, "sdt")} className="hidden rounded p-1.5 hover:bg-slate-100 hover:text-[#0068FF] lg:block" title={`Chép số ${chon.phone}`}>
                        {daCopy === "sdt" ? <Check className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                      </button>
                    )}
                    <a href="https://chat.zalo.me/" target="_blank" rel="noreferrer" className="hidden rounded p-1.5 hover:bg-slate-100 hover:text-[#0068FF] lg:block" title="Mở Zalo Web"><ExternalLink className="h-4 w-4" /></a>
                  </div>
                  <textarea
                    value={soan}
                    onChange={(e) => setSoan(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); guiTin(); } }}
                    rows={1}
                    placeholder="Nhập tin nhắn..."
                    className="max-h-32 min-h-[2.5rem] flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#0068FF] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={guiTin}
                    disabled={!soan.trim() || dangGui}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#0068FF] px-4 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {dangGui ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gửi
                  </button>
                </div>
                <p className="mt-1.5 hidden text-[10px] text-slate-400 lg:block">Enter gửi · Shift+Enter xuống dòng · tin đi qua cửa từ cấm trước khi tới khách; cầu nối Zalo gửi thật — chấm xám là đang chờ gửi.</p>
              </footer>
            </>
          )}
        </section>

        {/* ── CỘT PHẢI — hồ sơ khách ─────────────────────────────────────── */}
        <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-slate-200 bg-white lg:flex">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Thông tin khách hàng</h2>
          </div>
          {!chon ? (
            <p className="p-4 text-sm text-slate-500">Hồ sơ khách hiện ở đây khi mở một hội thoại.</p>
          ) : (
            <div className="space-y-4 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DCEBFF] text-sm font-bold text-[#0068FF]">{chuDau(chon.ten)}</span>
                <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{hoSo?.ten || chon.ten}</p>
                {chon.tenZalo && chon.tenZalo !== chon.ten && (
                  <p className="text-[11px] text-slate-400">Tên Zalo: {chon.tenZalo}</p>
                )}
                <p className="mt-0.5 text-xs text-slate-500">{hoSo?.phone || chon.phone || "chưa có số điện thoại"}</p>
                {chon.ngaySinh && <p className="text-xs text-slate-500">Sinh {chon.ngaySinh}</p>}
                {chon.trangThai && (
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-[11px] text-slate-500" title={chon.trangThai}>
                    {chon.trangThai}
                  </p>
                )}
                {/* Hai lớp phân loại nằm CẠNH nhau: thẻ MÁY suy từ đơn hàng + nhãn NGƯỜI gắn.
                    Lệch nhau là thông tin, không phải lỗi. */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {chon.the.map((t) => (
                    <span key={t} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${NHAN_THE[t as TheKhach]?.lop || ""}`}>
                      {NHAN_THE[t as TheKhach]?.chu || t}
                    </span>
                  ))}
                  {(nhanTaiCho[khoa(chon)] ?? chon.nhanSale).map((n) => (
                    <button
                      key={n}
                      onClick={() => doiNhan(n, false)}
                      title="Bấm để gỡ nhãn này"
                      className="group inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-100"
                    >
                      {n}<X className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
                    </button>
                  ))}
                  <button
                    onClick={() => setMoNhan((v) => !v)}
                    className="rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:border-[#0068FF] hover:text-[#0068FF]"
                  >
                    + Gắn nhãn
                  </button>
                  {chon.laBanBe && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-[#0068FF]">Đã kết bạn</span>
                  )}
                </div>
                </div>
                {moNhan && (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Nhãn — bấm để gắn{bangNhan.length ? "" : " (chưa có nhãn nào)"}
                    </p>
                    <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                      {bangNhan
                        .filter((n) => !(nhanTaiCho[khoa(chon)] ?? chon.nhanSale).includes(n.ten))
                        .map((n) => (
                          <button
                            key={n.id}
                            onClick={() => doiNhan(n.ten, true)}
                            className="rounded border border-white bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm hover:border-[#0068FF]"
                            style={n.mau ? { borderLeft: `3px solid ${n.mau}` } : undefined}
                          >
                            {n.ten}
                          </button>
                        ))}
                    </div>
                    <form className="mt-1.5 flex gap-1" onSubmit={(e) => { e.preventDefault(); const t = nhanMoi.trim(); if (t) { doiNhan(t, true); setNhanMoi(""); } }}>
                      <input value={nhanMoi} onChange={(e) => setNhanMoi(e.target.value)} placeholder="Tạo nhãn mới rồi gắn..." maxLength={40}
                        className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-[#0068FF]" />
                      <button type="submit" disabled={!nhanMoi.trim()} className="rounded bg-[#0068FF] px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40">+ Nhãn</button>
                    </form>
                  </div>
                )}
              </div>

              {!chon.phone && (
                <p className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500">
                  Khách chưa để lại số nên chưa nối được sang đơn hàng. Đây là chuyện thường ở inbox, không phải lỗi.
                </p>
              )}

              {hoSo && hoSo.soDon > 0 && (
                <section>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <ShoppingBag className="h-3.5 w-3.5" /> Đơn hàng
                  </p>
                  <p className="text-sm text-slate-900">
                    {hoSo.soDon} đơn · <span className="font-semibold">{tienVN(hoSo.tongChi)}đ</span>
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {hoSo.donGanDay.map((d, i) => (
                      <li key={i} className="text-[11px] text-slate-500">
                        <span className="text-slate-400">{d.ngay || "—"}</span> · {d.sanPham || "(không rõ mặt hàng)"} · {tienVN(d.khachTra)}đ
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* HÀNH ĐỘNG NHANH — ghi thật vào hệ thống, không phải nút dẫn sang trang khác.
                  CỐ Ý không có "Giao cho nhân viên": đồng nghiệp không mở được Zalo của nhau,
                  "chuyền" khách sang chỉ làm khách rơi vào khoảng không. */}
              <section className="border-t border-slate-100 pt-3">
                <p className="mb-1.5 text-xs font-semibold text-slate-700">Hành động nhanh</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setOViec(true)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <CheckSquare className="h-3.5 w-3.5" /> Tạo việc
                  </button>
                  <button
                    onClick={() => hanhDong({ viec: "ghi-cham", kieu: "message" }, "Đã ghi lượt chăm")}
                    disabled={!chon.phone}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    title={chon.phone ? "" : "Khách chưa có số nên chưa ghi được"}
                  >
                    <Send className="h-3.5 w-3.5" /> Đã nhắn
                  </button>
                  <button
                    onClick={() => hanhDong({ viec: "ghi-cham", kieu: "call" }, "Đã ghi cuộc gọi")}
                    disabled={!chon.phone}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <PhoneCall className="h-3.5 w-3.5" /> Đã gọi
                  </button>
                  <button
                    onClick={() => hanhDong({ viec: "ghi-cham", kieu: "gift" }, "Đã ghi tặng quà")}
                    disabled={!chon.phone}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Gift className="h-3.5 w-3.5" /> Tặng quà
                  </button>
                </div>
                {bao && (
                  <p className={`mt-2 rounded-lg px-2 py-1.5 text-[11px] ${
                    bao.startsWith("Không") ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                  }`}>{bao}</p>
                )}
              </section>

              {hoatDong.length > 0 && (
                <section className="border-t border-slate-100 pt-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Activity className="h-3.5 w-3.5" /> Hoạt động gần đây
                  </p>
                  <ul className="space-y-2">
                    {hoatDong.slice(0, 6).map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          h.loai === "don" ? "bg-emerald-500" : h.loai === "goi" ? "bg-blue-500" : "bg-slate-300"
                        }`} />
                        <span className="min-w-0">
                          <span className="block text-[11px] font-medium text-slate-700">{h.tieuDe}</span>
                          {h.chiTiet && <span className="block truncate text-[11px] text-slate-500">{h.chiTiet}</span>}
                          <span className="block text-[10px] text-slate-400">
                            {(h.luc || "").slice(0, 10)}{h.nguoi ? ` · ${h.nguoi}` : ""}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </aside>
      </div>

      {oViec && chon && (
        <OTaoViec
          ten={chon.ten}
          dong={() => setOViec(false)}
          gui={async (tieuDe, han, gap) => {
            await hanhDong({ viec: "tao-viec", tieuDe, han, gap }, "Đã tạo việc");
            setOViec(false);
          }}
        />
      )}
    </div>
  );
}

/** Ô tạo việc. Hạn mặc định HÔM NAY — giao là làm ngay, đừng đẩy việc sang mai. */
function OTaoViec({
  ten, dong, gui,
}: {
  ten: string;
  dong: () => void;
  gui: (tieuDe: string, han: string, gap: boolean) => Promise<void>;
}) {
  const homNay = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);   // ngày theo giờ VN
  const [tieuDe, setTieuDe] = useState(`Trả lời khách ${ten}`);
  const [han, setHan] = useState(homNay);
  const [gap, setGap] = useState(false);
  const [dangGui, setDangGui] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={dong}>
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Tạo việc</h2>
          <button onClick={dong} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <label className="block text-[11px] font-medium text-slate-600">Việc cần làm</label>
        <input
          value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} autoFocus
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
        />
        <label className="mt-3 block text-[11px] font-medium text-slate-600">Hạn</label>
        <input
          type="date" value={han} onChange={(e) => setHan(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
        />
        <label className="mt-3 flex items-center gap-2 text-[11px] text-slate-600">
          <input type="checkbox" checked={gap} onChange={(e) => setGap(e.target.checked)} /> Việc gấp
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={dong} className="rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100">Thôi</button>
          <button
            disabled={!tieuDe.trim() || dangGui}
            onClick={async () => { setDangGui(true); await gui(tieuDe.trim(), han, gap); setDangGui(false); }}
            className="rounded-lg bg-[#0068FF] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            {dangGui ? "Đang tạo..." : "Tạo việc"}
          </button>
        </div>
      </div>
    </div>
  );
}
