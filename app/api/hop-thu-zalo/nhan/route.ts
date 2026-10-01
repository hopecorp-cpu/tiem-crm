import { NextResponse } from "next/server";
import { getCurrentUser, getServiceClient } from "@/lib/supabase-server";
import { nickChoPhep } from "@/lib/hop-thu-zalo-server";

export const dynamic = "force-dynamic";

/**
 * GẮN / GỠ NHÃN cho khách Zalo. Nhãn sống trong CRM (bảng zalo_nhan + cột nhan_sale).
 * GET  → danh sách nhãn có sẵn
 * POST → { own, uid, ten (tên nhãn), bat: true|false }
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });
  const { data, error } = await getServiceClient().from("zalo_nhan").select("id, ten, mau").order("ten");
  if (error) return NextResponse.json({ loi: error.message }, { status: 500 });
  return NextResponse.json({ nhan: data || [] });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loi: "Chưa đăng nhập" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const own = String(b.own || "").trim(), uid = String(b.uid || "").trim();
  const ten = String(b.ten || "").trim();
  const bat = b.bat !== false;
  if (!own || !uid || !ten) return NextResponse.json({ loi: "Thiếu own/uid/ten" }, { status: 400 });

  // Gác bằng ĐÚNG hàm của trang — nhân viên không được sửa nhãn trên hộp thư của đồng nghiệp.
  const duocXem = await nickChoPhep(user);
  if (duocXem !== null && !duocXem.includes(own)) {
    return NextResponse.json({ loi: "Không có quyền thao tác trên hộp thư này" }, { status: 403 });
  }

  const sb = getServiceClient();
  // Nhãn chưa có thì tạo (id âm — chừa chỗ dương cho hệ thống nào cần nhập nhãn từ ngoài).
  let { data: nh } = await sb.from("zalo_nhan").select("id, ten").ilike("ten", ten).limit(1);
  if (!nh?.length) {
    if (!bat) return NextResponse.json({ loi: `Nhãn "${ten}" không tồn tại` }, { status: 400 });
    if (ten.length > 40) return NextResponse.json({ loi: "Tên nhãn tối đa 40 ký tự" }, { status: 400 });
    const { data: minRow } = await sb.from("zalo_nhan").select("id").order("id", { ascending: true }).limit(1).maybeSingle();
    const idMoi = Math.min(-1, Number(minRow?.id ?? 0) - 1);
    const { error: eN } = await sb.from("zalo_nhan").insert({ id: idMoi, ten, mau: "#0068FF", updated_at: new Date().toISOString() });
    if (eN) return NextResponse.json({ loi: "Không tạo được nhãn: " + eN.message }, { status: 500 });
    nh = [{ id: idMoi, ten }];
  }
  const tenChuan = nh[0].ten as string;

  const { data: dong } = await sb.from("zalo_bridge_contacts").select("nhan_sale").eq("own_id", own).eq("zalo_uid", uid).maybeSingle();
  if (!dong) return NextResponse.json({ loi: "Không thấy khách trong kho" }, { status: 404 });
  const cu: string[] = Array.isArray(dong.nhan_sale) ? dong.nhan_sale : [];
  const daCo = cu.includes(tenChuan);
  if (bat === daCo) return NextResponse.json({ ok: true, nhan: cu, ghiChu: "không đổi" });
  const moi = bat ? [...cu, tenChuan] : cu.filter((x) => x !== tenChuan);

  const { error: e1 } = await sb.from("zalo_bridge_contacts").update({ nhan_sale: moi, updated_at: new Date().toISOString() })
    .eq("own_id", own).eq("zalo_uid", uid);
  if (e1) return NextResponse.json({ loi: e1.message }, { status: 500 });

  return NextResponse.json({ ok: true, nhan: moi });
}
