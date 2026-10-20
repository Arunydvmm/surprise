import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  await destroySession(cookies().get(SESSION_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
