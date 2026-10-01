import { NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * KẾT NỐI ZALO TỪ WEB. Server web không nói chuyện được với Zalo → web chỉ ĐẶT YÊU CẦU
 * (config `zalo_ket_noi_yeu_cau`); máy quản lý cầu nối (`scripts/zalo-cau-noi-quan-ly.mjs`)
 * bật đăng nhập và đẩy QR + tiến độ lên `zalo_ket_noi_trang_thai`; web poll và vẽ QR cho
 * người quét bằng điện thoại.
 * GET  → { yeuCau, trangThai, cauNoi (nhịp tim máy quản lý) }
 * POST { nick } → đặt yêu cầu (chỉ quản lý — nối một nick Zalo vào hệ thống là quyết định quản trị)
 */
const doc = async (sb: any, key: string) => { const { data } = await sb.from("config").select("value").eq("key", key).maybeSingle(); try { return JSON.parse(data?.value || "null"); } catch { return null; } };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const sb = getServiceClient();
  const [yeuCau, trangThai, cauNoi] = await Promise.all([doc(sb, "zalo_ket_noi_yeu_cau"), doc(sb, "zalo_ket_noi_trang_thai"), doc(sb, "zalo_cau_noi_last")]);
  const cauNoiSong = !!cauNoi?.at && Date.now() - Date.parse(cauNoi.at) < 30_000;
  return NextResponse.json({ yeuCau, trangThai, cauNoi: { song: cauNoiSong, at: cauNoi?.at || null, dang: cauNoi?.dang || [], phien: cauNoi?.phien || [] } });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  if (!laQuanLy(user.vai_tro)) {
    return NextResponse.json({ loi: "Chỉ quản lý mới nối được nick Zalo mới" }, { status: 403 });
  }
  const b = await req.json().catch(() => ({} as any));
  const nick = String(b.nick || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!nick || nick.length > 20) return NextResponse.json({ loi: "Tên nick không hợp lệ (chữ thường/số/gạch ngang, ví dụ: hotline1, an)" }, { status: 400 });
  const sb = getServiceClient();
  const luc = new Date().toISOString();
  await sb.from("config").upsert({ key: "zalo_ket_noi_yeu_cau", value: JSON.stringify({ nick, boi: user.ho_ten || user.email, luc, trangThai: "cho" }) }, { onConflict: "key" });
  await sb.from("config").upsert({ key: "zalo_ket_noi_trang_thai", value: JSON.stringify({ nick, buoc: "cho-may", luc }) }, { onConflict: "key" });
  return NextResponse.json({ ok: true, nick });
}
