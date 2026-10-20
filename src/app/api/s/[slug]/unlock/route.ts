import { NextResponse } from "next/server";
import { getSurpriseBySlug } from "@/lib/surprises";
import { verifyPassword, PASSWORD_MAX } from "@/lib/password";
import { createUnlockToken, unlockCookieName, UNLOCK_TTL_SECONDS } from "@/lib/unlock";
import { clearLimit, clientIp, limited } from "@/lib/rate-limit";
import { isSameOrigin, readJsonLimited } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  const slug = params.slug.toLowerCase();
  const ip = clientIp(req);
  const perVisitor = `unlock:${slug}:${ip}`;
  // Two limits: one per visitor, one for the link as a whole (stops guessing spread across many IPs).
  if (await limited(perVisitor, 8) || await limited(`unlock-all:${slug}`, 80, 60 * 60 * 1000))
    return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });

  let body: { password?: string } | null;
  try { body = await readJsonLimited<{ password?: string }>(req, 4_096); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 413 }); }
  const password = body && typeof body.password === "string" && body.password.length <= PASSWORD_MAX ? body.password : "";

  const s = await getSurpriseBySlug(slug);
  const ok = !!s && s.is_published && (await verifyPassword(password, s.password_hash));
  if (!ok || !s) {
    await new Promise(r => setTimeout(r, 600));
    return NextResponse.json({ error: "That password doesn't match. Try again." }, { status: 401 });
  }
  await clearLimit(perVisitor);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(unlockCookieName(s.id), createUnlockToken(s.id, s.password_version), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: UNLOCK_TTL_SECONDS
  });
  return res;
}
