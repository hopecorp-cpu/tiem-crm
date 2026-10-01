"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Play, Save } from "lucide-react";
import type { CauHinhBot } from "@/lib/bot";

const INPUT = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0068FF]";

const CAU_THU = [
  "bảng giá bao nhiêu ạ",
  "mấy giờ mở cửa",
  "chị muốn đặt lịch",
  "kiểm tra lịch của tôi",
  "làm xong bị sưng đỏ hết móng rồi",
  "hôm nay trời đẹp nhỉ",
];

export default function BotClient({ cauHinh, soDichVu }: { cauHinh: CauHinhBot; soDichVu: number }) {
  const router = useRouter();
  const [c, setC] = useState({
    bat: cauHinh.bat, nguoiSau: String(cauHinh.nguoiSau), nghiPhut: String(cauHinh.nghiPhut),
    diaChi: cauHinh.diaChi, loiChao: cauHinh.loiChao, tuKhoaNguoi: cauHinh.tuKhoaNguoi.join(", "),
  });
  const [thu, setThu] = useState("bảng giá bao nhiêu ạ");
  const [kq, setKq] = useState<any>(null);
  const [chay, setChay] = useState(false);
  const [loi, setLoi] = useState("");
  const [luuXong, setLuuXong] = useState(false);

  async function goi(body: any) {
    setChay(true); setLoi("");
    try {
      const r = await fetch("/api/bot/thu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) { setLoi(j?.loi || "Không xong"); return null; }
      return j;
    } catch { setLoi("Mất mạng"); return null; } finally { setChay(false); }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 lg:p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
        <Bot className="h-5 w-5 text-[#0068FF]" /> Bot trả lời tự động
      </h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p>
          Bot nhận đúng <b>bốn việc</b>: đọc bảng giá · giờ mở cửa và địa chỉ · đưa link đặt lịch ·
          tra lịch sắp tới của khách theo số điện thoại. Ngoài bốn việc đó thì nó <b>im và nhường người thật</b>.
        </p>
        <p className="mt-2">
          Bot đọc bảng giá <b>từ mục Dịch vụ</b> ({soDichVu} dịch vụ đang bật), nên tăng giá là bot nói
          đúng giá mới ngay, không phải sửa gì. Chưa khai dịch vụ nào thì bot không đáp câu hỏi giá.
        </p>
        <p className="mt-2 text-slate-500">
          Câu bot soạn vẫn đi qua <b>cửa từ cấm</b> như tin người gõ. Dính từ cấm thì bot im và gọi người,
          không bao giờ tự sửa câu rồi gửi.
        </p>
      </div>

      {/* ------------------------------------------- THỬ */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Thử trước khi bật</h2>
        <p className="mt-1 text-xs text-slate-500">Gõ một câu như khách hay hỏi. Thử thì KHÔNG gửi đi đâu cả.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CAU_THU.map((t) => (
            <button key={t} onClick={() => setThu(t)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-200">{t}</button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input value={thu} onChange={(e) => setThu(e.target.value)} className={INPUT} />
          <button disabled={chay || !thu.trim()} onClick={async () => setKq(await goi({ tin: thu, kenh: "facebook" }))}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-[#0068FF] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
            <Play className="h-4 w-4" /> Thử
          </button>
        </div>
        {kq && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            {kq.tra
              ? <pre className="whitespace-pre-wrap text-sm text-slate-800">{kq.tra}</pre>
              : <p className="text-sm font-medium text-amber-700">Bot IM, nhường người thật.</p>}
            <p className="mt-2 text-[11px] text-slate-500">
              nhận ra ý: <b>{kq.yDinh}</b> · {kq.lyDo}{kq.chuyenNguoi && " · cần người thật vào"}
            </p>
          </div>
        )}
      </section>

      {/* ------------------------------------------- CÀI ĐẶT */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Cài đặt</h2>
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={c.bat} onChange={(e) => setC({ ...c, bat: e.target.checked })} className="h-4 w-4" />
            <span><b>Bật bot</b> — trả lời tự động trên Facebook và Zalo</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <L nhan="Nhường người sau mấy lượt bot nói">
              <input value={c.nguoiSau} onChange={(e) => setC({ ...c, nguoiSau: e.target.value })} inputMode="numeric" className={INPUT} />
            </L>
            <L nhan="Cùng một khách, nghỉ bao nhiêu phút mới đáp tiếp">
              <input value={c.nghiPhut} onChange={(e) => setC({ ...c, nghiPhut: e.target.value })} inputMode="numeric" className={INPUT} />
            </L>
          </div>
          <L nhan="Địa chỉ tiệm (bot đọc khi khách hỏi đường)">
            <input value={c.diaChi} onChange={(e) => setC({ ...c, diaChi: e.target.value })} className={INPUT} />
          </L>
          <L nhan="Câu chào (để trống thì bot dùng câu mặc định)">
            <textarea value={c.loiChao} onChange={(e) => setC({ ...c, loiChao: e.target.value })} rows={2} className={INPUT} />
          </L>
          <L nhan="Từ khoá PHẢI để người thật xử lý (cách nhau bằng dấu phẩy)">
            <textarea value={c.tuKhoaNguoi} onChange={(e) => setC({ ...c, tuKhoaNguoi: e.target.value })} rows={2} className={INPUT} />
          </L>
          <p className="text-xs text-slate-500">
            Thấy một trong các từ trên là bot IM ngay, kể cả khi nó hiểu câu hỏi. Khách đang bực hoặc
            đang đau mà gặp máy trả lời là mất khách thật — danh sách này nên dài, đừng cắt bớt.
          </p>
          {loi && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{loi}</p>}
          <button disabled={chay} onClick={async () => { if (await goi({ luu: true, ...c })) { setLuuXong(true); router.refresh(); } }}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
            <Save className="h-4 w-4" /> {luuXong ? "Đã lưu" : "Lưu cài đặt"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">Bot bên Zalo chạy khác Facebook</h2>
        <p className="mt-2">
          Facebook có webhook nên bot đáp tức thì. Zalo thì server không với tới được, nên bot phải
          QUÉT theo chu kỳ. Trên máy chạy cầu nối, đặt một việc theo giờ gọi lệnh này mỗi 2 phút:
        </p>
        <code className="mt-2 block overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
          curl -s -X POST &lt;tên miền&gt;/api/bot/zalo -H &quot;x-bot-key: $BOT_QUET_KEY&quot;
        </code>
        <p className="mt-2 text-xs text-slate-500">
          Đặt <code className="rounded bg-slate-100 px-1">BOT_QUET_KEY</code> trong biến môi trường của web.
          Bot Zalo chỉ đụng chat 1-1, KHÔNG đụng nhóm cộng đồng, và chỉ trả lời tin dưới 30 phút.
        </p>
      </section>
    </div>
  );
}

function L({ nhan, children }: { nhan: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">{nhan}</span>{children}</label>;
}
