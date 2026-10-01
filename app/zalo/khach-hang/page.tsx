import Link from "next/link";
import ChuaGanNick from "../ChuaGanNick";
import { redirect } from "next/navigation";
import { ZaloThanhTren, ZaloMenuNgang } from "../ZaloMobile";
import { getCurrentUser } from "@/lib/supabase-server";
import { layDanhSachKhach, nickChoPhep } from "@/lib/hop-thu-zalo-server";
import { NHAN_THE, chuDau, doTre, type TheKhach } from "@/lib/hop-thu-zalo";
import { MessageSquare, Search, UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Khách hàng | Zalo CRM" };

const boDau = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase();

/**
 * Danh bạ khách Zalo — cùng nguồn với hộp thư, chỉ đổi cách bày (bảng thay vì danh sách chat).
 * Cố ý KHÔNG dựng truy vấn riêng: hai màn hình cùng nói về một tệp khách mà đếm bằng hai
 * đường thì sớm muộn cũng lệch, rồi không ai biết bên nào đúng.
 *
 * HAI LỚP PHÂN LOẠI NẰM CẠNH NHAU: thẻ MÁY suy từ đơn hàng (VIP / Đã mua / Mua lại / Cần
 * chăm sóc) và nhãn NGƯỜI gắn. Không gộp, không để cái này đè cái kia — lệch nhau chính là
 * thông tin ("máy thấy đã mua 3 đơn mà nhãn vẫn để Khách mới" là chuyện đáng biết).
 */
export default async function KhachZaloPage({
  searchParams,
}: {
  searchParams?: { q?: string; nhan?: string; loc?: string; trang?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const duocXem = await nickChoPhep(user);
  if (duocXem !== null && !duocXem.length) return <ChuaGanNick ten={user.ho_ten || ""} />;   // rỗng ≠ tất cả
  const tatCa = (await layDanhSachKhach(duocXem ?? [], 8000)).filter((k) => !k.laNhom);

  const q = boDau(searchParams?.q || "");
  const nhanChon = searchParams?.nhan || "";
  const loc = searchParams?.loc || "";     // "" | "co-so" | "da-mua" | "cham" | "ban-be" | "cho"
  const trang = Math.max(1, Number(searchParams?.trang) || 1);
  const MOI_TRANG = 100;

  const ds = tatCa.filter((k) => {
    if (q && !boDau(`${k.ten} ${k.tenZalo || ""} ${k.phone || ""} ${k.trangThai || ""}`).includes(q)) return false;
    if (nhanChon && !k.nhanSale.includes(nhanChon)) return false;
    if (loc === "co-so" && !k.phoneNorm) return false;
    if (loc === "da-mua" && !k.the.some((t) => t !== "chua-mua")) return false;
    if (loc === "cham" && !k.the.includes("chua-mua")) return false;
    if (loc === "ban-be" && !k.laBanBe) return false;
    if (loc === "cho" && !k.dangCho) return false;
    return true;
  });
  const soTrang = Math.max(1, Math.ceil(ds.length / MOI_TRANG));
  const hien = ds.slice((trang - 1) * MOI_TRANG, trang * MOI_TRANG);

  // Nhãn đang dùng + số người mỗi nhãn (đếm trên TOÀN tệp, không đếm trên trang đang lọc)
  const demNhan: Record<string, number> = {};
  for (const k of tatCa) for (const n of k.nhanSale) demNhan[n] = (demNhan[n] || 0) + 1;
  const nhanTop = Object.entries(demNhan).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const coSo = tatCa.filter((k) => k.phoneNorm).length;
  const daMua = tatCa.filter((k) => k.the.some((t) => t !== "chua-mua")).length;
  const banBe = tatCa.filter((k) => k.laBanBe).length;
  const coNhan = tatCa.filter((k) => k.nhanSale.length).length;

  const url = (them: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const all: Record<string, any> = { q: searchParams?.q, nhan: nhanChon, loc, ...them };
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== "" && v !== null) p.set(k, String(v));
    const s = p.toString();
    return "/zalo/khach-hang" + (s ? "?" + s : "");
  };

  return (
    <div className="space-y-4 pb-4 lg:p-5">
      <ZaloThanhTren tieuDe="Khách hàng" />
      <ZaloMenuNgang />
      <div className="space-y-4 px-3 lg:px-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-lg font-semibold text-slate-900">Khách Zalo</h1>
          <span className="text-sm text-slate-500">
            {tatCa.length.toLocaleString("vi-VN")} người · {coSo.toLocaleString("vi-VN")} có số điện thoại · {daMua} đã từng mua
            · {banBe.toLocaleString("vi-VN")} là bạn bè · {coNhan} có nhãn gắn
          </span>
        </div>

        {/* Tìm + lọc — form GET để trang server tự lọc, không cần JS */}
        <form method="get" action="/zalo/khach-hang" className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q" defaultValue={searchParams?.q || ""}
              placeholder="Tìm tên, tên Zalo, số điện thoại, câu trạng thái..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-[#0068FF]"
            />
          </div>
          {nhanChon && <input type="hidden" name="nhan" value={nhanChon} />}
          {loc && <input type="hidden" name="loc" value={loc} />}
          <button className="rounded-lg bg-[#0068FF] px-3 py-2 text-sm font-medium text-white">Tìm</button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {([
            ["", `Tất cả (${tatCa.length})`],
            ["cho", `Đang chờ (${tatCa.filter((k) => k.dangCho).length})`],
            ["cham", `Cần chăm sóc (${tatCa.filter((k) => k.the.includes("chua-mua")).length})`],
            ["da-mua", `Đã mua (${daMua})`],
            ["co-so", `Có số (${coSo})`],
            ["ban-be", `Bạn bè (${banBe})`],
          ] as const).map(([k, nhan]) => (
            <Link key={k} href={url({ loc: k, trang: undefined })}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${loc === k ? "bg-[#0068FF] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {nhan}
            </Link>
          ))}
        </div>

        {nhanTop.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Nhãn đã gắn:</span>
            {nhanTop.map(([n, so]) => (
              <Link key={n} href={url({ nhan: nhanChon === n ? undefined : n, trang: undefined })}
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${nhanChon === n ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-700 hover:bg-violet-100"}`}>
                {n} <span className="opacity-70">{so}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Khách</th>
                <th className="px-4 py-2.5 font-medium">Số điện thoại</th>
                <th className="px-4 py-2.5 font-medium">Ngày sinh</th>
                <th className="px-4 py-2.5 font-medium">Thẻ (máy)</th>
                <th className="px-4 py-2.5 font-medium">Nhãn (người)</th>
                <th className="px-4 py-2.5 font-medium">Nick</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {hien.map((k) => (
                <tr key={`${k.ownId}|${k.uid}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                        {chuDau(k.ten)}
                      </span>
                      <span className="min-w-0">
                        <span className="block max-w-[16rem] truncate font-medium text-slate-900">{k.ten}</span>
                        {k.tenZalo && k.tenZalo !== k.ten && (
                          <span className="block max-w-[16rem] truncate text-[11px] text-slate-400">Zalo: {k.tenZalo}</span>
                        )}
                      </span>
                      {k.laBanBe && <UserCheck className="h-3.5 w-3.5 shrink-0 text-[#0068FF]" aria-label="Đã kết bạn" />}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{k.phone || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{k.ngaySinh || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex flex-wrap gap-1">
                      {k.the.map((t) => (
                        <span key={t} className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium ${NHAN_THE[t as TheKhach]?.lop || ""}`}>
                          {NHAN_THE[t as TheKhach]?.chu || t}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex max-w-[14rem] flex-wrap gap-1">
                      {k.nhanSale.map((n) => (
                        <span key={n} className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{n}</span>
                      ))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{k.sale || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {k.dangCho ? (
                      <span className="whitespace-nowrap rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Chờ {doTre(k.choGio)}</span>
                    ) : k.soTin ? (
                      <span className="text-xs text-slate-400">{k.soTin} tin</span>
                    ) : (
                      <span className="text-xs text-slate-300">chưa nhắn</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/zalo/tin-nhan?hoi-thoai=${encodeURIComponent(`${k.ownId}|${k.uid}`)}`}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <MessageSquare className="h-3 w-3" /> Chat
                    </Link>
                  </td>
                </tr>
              ))}
              {hien.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">Không có khách nào khớp bộ lọc.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {soTrang > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Trang {trang}/{soTrang} · {ds.length.toLocaleString("vi-VN")} người khớp</span>
            <span className="flex gap-1.5">
              {trang > 1 && <Link href={url({ trang: trang - 1 })} className="rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50">Trước</Link>}
              {trang < soTrang && <Link href={url({ trang: trang + 1 })} className="rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50">Sau</Link>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
