import { NextResponse } from "next/server";
import { gateCookieName } from "@/lib/site-gate";
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(gateCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
