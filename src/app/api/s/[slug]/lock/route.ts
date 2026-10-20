import { NextResponse } from "next/server";
import { getSurpriseBySlug } from "@/lib/surprises";
import { unlockCookieName } from "@/lib/unlock";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  const s = await getSurpriseBySlug(params.slug.toLowerCase());
  const res = NextResponse.json({ ok: true });
  if (s) res.cookies.set(unlockCookieName(s.id), "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
