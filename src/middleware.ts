import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "kids_session";

function signingKey(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  );
}

/**
 * Route guards (edge runtime, no DB):
 *  - /dashboard/* needs any session
 *  - /admin/* needs an admin session
 *  - /login & /signup bounce logged-in users to the console
 * API routes enforce their own auth inside handlers (DB-backed checks).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;

  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, signingKey());
      role = String(payload.role ?? "user");
    } catch {
      role = null;
    }
  }

  const needsAuth = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const isAdminArea = pathname.startsWith("/admin");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  const redirect = (to: string) => {
    const url = req.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (needsAuth && !role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminArea && role !== "admin") {
    return redirect("/dashboard");
  }

  if (isAuthPage && role) {
    return redirect("/dashboard");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/signup"],
};
