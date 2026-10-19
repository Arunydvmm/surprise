import { NextResponse } from "next/server";
import { createGateToken, gateCookieName, validPassword } from "@/lib/site-gate";
import { clearLimit, clientIp, limited } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const key = "gate:" + clientIp(request);
  if (limited(key, 15)) return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  let body: { password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!validPassword(body.password || "")) {
    return NextResponse.json({ error: "That password doesn't match. Try again." }, { status: 401 });
  }
  clearLimit(key);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(gateCookieName, createGateToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24
  });
  return response;
}
