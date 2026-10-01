import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export type NguoiDung = {
  id: string;
  ho_ten: string;
  vai_tro: "quan-ly" | "nhan-vien" | string;
  active: boolean | null;
  email?: string | null;
};

/**
 * Server client với cookie session — dùng để xác thực người dùng (auth.getUser()).
 */
export function getServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list: { name: string; value: string; options?: any }[]) =>
          list.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch { /* trong RSC không set được — bỏ qua */ }
          }),
      },
    }
  );
}

/**
 * Service-role client — BYPASS RLS hoàn toàn. Chỉ gọi phía server, sau khi đã xác
 * thực người dùng. KHÔNG bao giờ trả client này về trình duyệt.
 */
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      // Next.js cache fetch mặc định → truy vấn server bị "đóng băng" giá trị cũ.
      // Ép no-store để luôn đọc dữ liệu mới nhất.
      global: { fetch: (url: any, opts: any = {}) => fetch(url, { ...opts, cache: "no-store" }) },
    }
  );
}

/** Hồ sơ người dùng hiện tại. Tài khoản đã tắt (active=false) coi như không có quyền. */
export async function getCurrentUser(): Promise<NguoiDung | null> {
  const sb = getServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const admin = getServiceClient();
  const { data } = await admin.from("nguoi_dung").select("*").eq("id", user.id).maybeSingle();
  if (!data || data.active === false) return null;
  return { ...data, email: user.email } as NguoiDung;
}
