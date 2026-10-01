import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { timTuCam } from "@/lib/tu-cam";

export const dynamic = "force-dynamic";

/**
 * MẪU TIN NHANH — lưu sẵn nội dung, một bấm chèn vào ô gửi.
 * Kho: config `zalo_mau_tin` = [{id, ten, noiDung, nhom, boi, luc}]. Chỗ giữ `{ten}` được
 * thay bằng tên khách lúc chèn. Mọi mẫu qua CỬA TỪ CẤM khi lưu — mẫu là chữ sẽ đi ra khách
 * hàng nghìn lần, dính một từ là dính hàng nghìn lần.
 * GET → tất cả · POST {ten, noiDung, nhom} thêm/sửa (quản lý) · DELETE ?id= (quản lý)
 */
const KEY = "zalo_mau_tin";
const doc = async (sb: any) => { const { data } = await sb.from("config").select("value").eq("key", KEY).maybeSingle(); try { return JSON.parse(data?.value || "null"); } catch { return null; } };
const ghi = (sb: any, ds: any[]) => sb.from("config").upsert({ key: KEY, value: JSON.stringify(ds) }, { onConflict: "key" });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const ds = await doc(getServiceClient());
  return NextResponse.json({ mau: Array.isArray(ds) ? ds : [] });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  if (!laQuanLy(user.vai_tro)) return NextResponse.json({ loi: "Chỉ quản lý sửa được mẫu tin" }, { status: 403 });
  const b = await req.json().catch(() => ({} as any));
  const ten = String(b.ten || "").trim().slice(0, 80), noiDung = String(b.noiDung || "").trim().slice(0, 2000), nhom = String(b.nhom || "Chung").trim().slice(0, 40);
  if (!ten || !noiDung) return NextResponse.json({ loi: "Thiếu tên hoặc nội dung" }, { status: 400 });
  const tuCam = await timTuCam(noiDung);
  if (tuCam.length) return NextResponse.json({ loi: `Mẫu có từ trong danh sách cấm: ${tuCam.join(", ")}`, tuCam }, { status: 400 });
  const sb = getServiceClient();
  const ds: any[] = (await doc(sb)) || [];
  const id = String(b.id || "") || randomUUID();
  const i = ds.findIndex((m) => m.id === id);
  const moi = { id, ten, noiDung, nhom, boi: user.ho_ten || user.email, luc: new Date().toISOString() };
  if (i >= 0) ds[i] = moi; else ds.push(moi);
  await ghi(sb, ds);
  return NextResponse.json({ ok: true, mau: ds });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  if (!laQuanLy(user.vai_tro)) return NextResponse.json({ loi: "Chỉ quản lý xoá được mẫu tin" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const sb = getServiceClient();
  const ds: any[] = ((await doc(sb)) || []).filter((m: any) => m.id !== id);
  await ghi(sb, ds);
  return NextResponse.json({ ok: true, mau: ds });
}
