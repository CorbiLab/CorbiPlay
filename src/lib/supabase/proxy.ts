import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session cookie on every request and redirects
 * unauthenticated users away from the authenticated area. Called from the
 * root `proxy.ts` (Next.js 16 renamed `middleware.ts` to `proxy.ts` — same
 * behaviour, see docs/ARCHITECTURE.md).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login");
  const isPublicAsset = pathname.startsWith("/_next");
  // /auth/confirm exchanges an emailed link for a session (no user yet when
  // the request arrives); /reset-password needs that freshly-exchanged
  // session to stick around long enough to set a new password. Neither
  // should bounce to /login for lacking a user yet, nor to /dashboard for
  // already having one — unlike /login, they're not "already signed in, no
  // reason to be here."
  const isPasswordRecoveryRoute = pathname.startsWith("/auth/confirm") || pathname.startsWith("/reset-password");

  if (!user && !isAuthRoute && !isPasswordRecoveryRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
