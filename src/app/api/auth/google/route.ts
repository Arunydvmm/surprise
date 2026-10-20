import { NextResponse } from "next/server";
import { appOrigin, googleConfig, newOAuthState, OAUTH_COOKIE, redirectUri, safeNext } from "@/lib/google";
import { clientIp, limited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step 1: send the visitor to Google. */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const cfg = googleConfig();
  if (!cfg || !process.env.SITE_COOKIE_SECRET) return NextResponse.redirect(new URL("/login?error=config", origin));
  if (await limited("oauth:" + clientIp(req), 40)) return NextResponse.redirect(new URL("/login?error=rate", origin));
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const { s, cookie, challenge } = newOAuthState(next);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: cfg.clientId, redirect_uri: redirectUri(req), response_type: "code", scope: "openid email profile",
    state: s.state, nonce: s.nonce, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account"
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 600 });
  return res;
}
