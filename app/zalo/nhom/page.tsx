import Link from "next/link";
import ChuaGanNick from "../ChuaGanNick";
import { redirect } from "next/navigation";
import { ZaloThanhTren, ZaloMenuNgang } from "../ZaloMobile";
import { getCurrentUser } from "@/lib/supabase-server";
import { layNhom, nickChoPhep } from "@/lib/hop-thu-zalo-server";
import { doTre, gioTu } from "@/lib/hop-thu-zalo";
import { MessageSquare, UsersRound } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhóm Zalo | Zalo CRM" };

export default async function NhomZaloPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const duocXem = await nickChoPhep(user);
  if (duocXem !== null && !duocXem.length) return <ChuaGanNick ten={user.ho_ten || ""} />;   // rỗng ≠ tất cả
  const ds = await layNhom(duocXem ?? []);

  const daDo = ds.filter((n) => n.soThanhVien != null);
  const tongTv = daDo.reduce((s, n) => s + (n.soThanhVien || 0), 0);

  return (
    <div className="space-y-4 pb-4 lg:p-5">
      <ZaloThanhTren tieuDe="Nhóm" />
      <ZaloMenuNgang />
      <div className="space-y-4 px-3 lg:px-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-lg font-semibold text-slate-900">Nhóm cộng đồng Zalo</h1>
        <span className="text-sm text-slate-500">
          {ds.length} nhóm
          {daDo.length ? ` · ${tongTv.toLocaleString("vi-VN")} thành viên (đo được ${daDo.length}/${ds.length} nhóm)` : ""}
        </span>
      </div>

      {daDo.length < ds.length && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          {ds.length - daDo.length} nhóm chưa đo được số thành viên — đó là <strong>chưa đo được</strong>,
          không phải nhóm rỗng. Số thành viên đọc từ bảng zalo_group_snapshots (tuỳ chọn).
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium">Nhóm</th>
              <th className="px-4 py-2.5 font-medium">Thành viên</th>
              <th className="px-4 py-2.5 font-medium">Nick trong nhóm</th>
              <th className="px-4 py-2.5 font-medium">Tin đã lưu</th>
              <th className="px-4 py-2.5 font-medium">Hoạt động cuối</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {ds.map((n) => {
              const im = gioTu(n.tinCuoiAt);
              return (
                <tr key={`${n.ownId}|${n.uid}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                        <UsersRound className="h-3.5 w-3.5" />
                      </span>
                      <span className="max-w-[20rem] truncate font-medium text-slate-900">{n.ten}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {n.soThanhVien != null ? n.soThanhVien.toLocaleString("vi-VN") : <span className="text-slate-300">chưa đo</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{n.sale || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{n.soTin}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {im == null ? "—" : im > 30 * 24
                      ? <span className="text-amber-700">im {doTre(im)}</span>
                      : `${doTre(im)} trước`}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/zalo/tin-nhan?hoi-thoai=${encodeURIComponent(`${n.ownId}|${n.uid}`)}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <MessageSquare className="h-3 w-3" /> Mở nhóm
                    </Link>
                  </td>
                </tr>
              );
            })}
            {ds.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Chưa có nhóm nào trong kho.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
