import { NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { laQuanLy } from "@/lib/auth";
import { layTrang, kiemTrang, dangKyWebhook, G } from "@/lib/facebook-server";

export const dynamic = "force-dynamic";

/**
 * NỐI TRANG FACEBOOK — chỉ quản lý.
 * POST {token}         -> nhận token, tự hỏi Graph xem token này của trang nào rồi lưu
 * POST {pageId,kiem}   -> kiểm token còn sống không
 * POST {pageId,dangKy} -> bật nhận tin cho trang
 * POST {pageId,tat}    -> tắt trang
 *
 * CỐ Ý KHÔNG làm đăng nhập OAuth: luồng đó cần app đã duyệt + màn hình đồng ý, quá
 * nặng cho một tiệm. Dán token là xong, và token KHÔNG BAO GIỜ quay về trình duyệt.
 */
async function gac() {
  const user = await getCurrentUser();
  if (!user) return { loi: "Chưa đăng nhập", ma: 401 };
  if (!laQuanLy(user.vai_tro)) return { loi: "Chỉ quản lý nối được trang Facebook", ma: 403 };
  return null;
}

export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const { data } = await getServiceClient().from("config").select("value").eq("key", "fb_verify_token").maybeSingle();
  return NextResponse.json({ trang: await layTrang(), coVerify: !!(data?.value || "").trim() });
}

export async function POST(req: Request) {
  const chan = await gac();
  if (chan) return NextResponse.json({ loi: chan.loi }, { status: chan.ma });
  const b = await req.json().catch(() => ({}));
  const sb = getServiceClient();

  if (b.verifyToken !== undefined) {
    await sb.from("config").upsert({ key: "fb_verify_token", value: String(b.verifyToken).trim() }, { onConflict: "key" });
    return NextResponse.json({ ok: true });
  }

  if (b.token) {
    const tok = String(b.token).trim();
    // Hỏi Graph token này là của trang nào — bắt người gõ tay page id là mời gõ sai.
    const r = await fetch(`${G}/me?fields=id,name&access_token=${encodeURIComponent(tok)}`);
    const j: any = await r.json().catch(() => ({}));
    if (j?.error || !j?.id) {
      return NextResponse.json({ loi: j?.error?.message || "Token không dùng được" }, { status: 400 });
    }
    const { error } = await sb.from("fb_pages").upsert(
      { page_id: String(j.id), ten: j.name || null, token: tok, active: true, loi_cuoi: null, kiem_luc: new Date().toISOString() },
      { onConflict: "page_id" });
    return error ? NextResponse.json({ loi: error.message }, { status: 400 })
                 : NextResponse.json({ ok: true, pageId: j.id, ten: j.name });
  }

  const pageId = String(b.pageId || "");
  if (!pageId) return NextResponse.json({ loi: "Thiếu mã trang" }, { status: 400 });
  if (b.kiem)   return NextResponse.json(await kiemTrang(pageId));
  if (b.dangKy) { const k = await dangKyWebhook(pageId); return k.ok ? NextResponse.json(k) : NextResponse.json({ loi: k.loi }, { status: 400 }); }
  if (b.tat !== undefined) {
    await sb.from("fb_pages").update({ active: !b.tat }).eq("page_id", pageId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ loi: "Không rõ cần làm gì" }, { status: 400 });
}
