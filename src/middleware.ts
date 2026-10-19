import { NextRequest, NextResponse } from "next/server";

async function valid(token?: string) {
  const secret = process.env.SITE_COOKIE_SECRET;
  if (!token || !secret) return false;
  const [value, sig] = token.split(".");
  if (!value || !sig || !/^\d{13}$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < Date.now() || Number(value) > Date.now() + 24 * 60 * 60 * 1000 + 60_000) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = sig.match(/.{2}/g);
    if (!signature || signature.length !== 32 || !/^[0-9a-f]{64}$/i.test(sig)) return false;
    const bytes = new Uint8Array(signature.map(part => parseInt(part, 16)));
    return await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(value));
  } catch { return false; }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/gate") || pathname.startsWith("/api/files") || pathname === "/api/health" || pathname === "/api/ready" ||
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
