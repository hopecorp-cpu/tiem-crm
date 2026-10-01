import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Chưa đăng nhập thì mọi trang đá về /login. Session Supabase được làm tươi ở đây. */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options?: any }[]) =>
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic = path === "/login" || path.startsWith("/_next") || path.startsWith("/api/auth");
  if (!user && !isPublic) return NextResponse.redirect(new URL("/login", req.url));
  if (user && path === "/login") return NextResponse.redirect(new URL("/zalo", req.url));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.).*)"],
};
