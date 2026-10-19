import { NextResponse } from "next/server";
import { adminCookieName, createAdminToken, hasAdminAccess, validAdminPassword } from "@/lib/admin-gate";
import { clearLimit, clientIp, limited } from "@/lib/rate-limit";

const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/" };

export async function GET() {
  const ok = await hasAdminAccess();
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}

export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "ADMIN_PASSWORD is not set on the server. Add it to your environment variables and redeploy." }, { status: 500 });
  if (!process.env.SITE_COOKIE_SECRET || process.env.SITE_COOKIE_SECRET.length < 16) return NextResponse.json({ error: "SITE_COOKIE_SECRET is not set (or too short). Add a random 32+ character value and redeploy." }, { status: 500 });
  const key = "admin:" + clientIp(request);
  if (limited(key)) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  if (!validAdminPassword(body.password || "")) {
    await new Promise(r => setTimeout(r, 800));
    return NextResponse.json({ error: "Wrong admin password." }, { status: 401 });
  }
  clearLimit(key);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName, createAdminToken(), { ...opts, maxAge: 12 * 60 * 60 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName, "", { ...opts, maxAge: 0 });
  return res;
}
