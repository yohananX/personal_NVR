import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep in sync with SESSION_COOKIE in lib/auth.ts.
// (Imported by value only - middleware runs on Edge, lib/auth needs Node.)
const SESSION_COOKIE = "nvr_session";

/**
 * Edge-safe fast path only: redirect anonymous page visits to /login.
 * Real authorization (roles, expiry) is enforced in API routes and
 * server components via lib/auth.ts - this just checks cookie presence.
 */
const PROTECTED = [/^\/$/, /^\/cameras(\/|$)/, /^\/recordings(\/|$)/];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = Boolean(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (pathname === "/login") {
    if (hasCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (PROTECTED.some((re) => re.test(pathname)) && !hasCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/cameras/:path*", "/recordings/:path*"],
};
