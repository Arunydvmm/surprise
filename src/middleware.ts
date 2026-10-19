import { NextRequest, NextResponse } from "next/server";

async function valid(token?: string) {
  const secret = process.env.SITE_COOKIE_SECRET;
  if (!token || !secret) return false;
  const [value, sig] = token.split(".");
  if (!value || !sig || Number(value) < Date.now()) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
    const expected = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, "0")).join("");
    return expected.length === sig.length && expected === sig;
  } catch { return false; }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/gate") || pathname.startsWith("/api/files") || pathname === "/api/health" ||
      pathname === "/favicon.ico" || pathname.startsWith("/admin") || pathname.startsWith("/api/admin") || pathname.startsWith("/unlock")) {
    return NextResponse.next();
  }
  const allowed = await valid(request.cookies.get("bestie-surprise-access")?.value);
  if (pathname.startsWith("/api/")) {
    if (!allowed) return NextResponse.json({ error: "Password required." }, { status: 401 });
    return NextResponse.next();
  }
  if (!allowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/unlock";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
