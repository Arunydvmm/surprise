import { NextRequest, NextResponse } from "next/server";

/**
 * Light gate only: visitors with no session cookie are sent to /login before any dashboard or admin
 * page renders. The real check (valid session, ownership, admin role) happens on the server for every
 * page and API call, so a forged cookie gets nothing.
 */
export function middleware(request: NextRequest) {
  if (!request.cookies.get("s4u_session")?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
