import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps admin sign-in sessions fresh and sends signed-out visitors to the login page.
 * Runs for the staff dashboard (/admin), the care worker portal (/portal) and the family portal (/family). Detailed checks (staff role, two-step) happen in the pages.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPage = ["/admin/login", "/admin/forgot-password", "/admin/set-password", "/portal/login", "/family/login"].some((p) => path.startsWith(p));
  if (!user && !isPublicPage) {
    const area = path.startsWith("/portal") ? "/portal" : path.startsWith("/family") ? "/family" : "/admin";
    const login = request.nextUrl.clone();
    login.pathname = `${area}/login`;
    login.search = path === area ? "" : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/family/:path*"],
};
