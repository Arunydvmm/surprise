import { createHash, randomBytes } from "crypto";
import { b64url, hmac, safeEqual } from "@/lib/sign";

export const OAUTH_COOKIE = "s4u_oauth";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Public base URL of the site. Set APP_URL in production; the forwarded headers are only a fallback. */
export function appOrigin(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
export const redirectUri = (req: Request) => `${appOrigin(req)}/api/auth/google/callback`;

export const safeNext = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : "/dashboard");

type OAuthState = { state: string; nonce: string; verifier: string; next: string };

export function newOAuthState(next: string) {
  const s: OAuthState = { state: randomBytes(16).toString("base64url"), nonce: randomBytes(16).toString("base64url"), verifier: randomBytes(32).toString("base64url"), next };
  const payload = b64url(JSON.stringify(s));
  return { s, cookie: `${payload}.${hmac("oauth", payload)}`, challenge: createHash("sha256").update(s.verifier).digest("base64url") };
}

export function readOAuthState(cookie: string | undefined): OAuthState | null {
  try {
    if (!cookie) return null;
    const [payload, sig] = cookie.split(".");
    if (!payload || !sig || !safeEqual(sig, hmac("oauth", payload))) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch { return null; }
}

export type GoogleProfile = { sub: string; email: string; name: string | null; picture: string | null };

/**
 * Exchanges the authorization code. The ID token comes straight from Google's token endpoint over TLS,
 * and we still check issuer, audience, expiry, nonce and that the email is verified.
 */
export async function exchangeCode(req: Request, code: string, st: OAuthState): Promise<GoogleProfile> {
  const cfg = googleConfig();
  if (!cfg) throw new Error("Google OAuth is not configured");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: redirectUri(req), grant_type: "authorization_code", code_verifier: st.verifier }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Google token exchange failed: " + res.status);
  const tok = await res.json() as { id_token?: string };
  if (!tok.id_token) throw new Error("No id_token returned");
  const claims = JSON.parse(Buffer.from(tok.id_token.split(".")[1] || "", "base64url").toString("utf8"));
  if (!["https://accounts.google.com", "accounts.google.com"].includes(claims.iss)) throw new Error("Bad issuer");
  if (claims.aud !== cfg.clientId) throw new Error("Bad audience");
  if (!claims.exp || claims.exp * 1000 < Date.now()) throw new Error("Token expired");
  if (claims.nonce !== st.nonce) throw new Error("Bad nonce");
  if (!claims.sub || !claims.email || claims.email_verified !== true) throw new Error("Email not verified");
  return { sub: String(claims.sub), email: String(claims.email).toLowerCase(), name: claims.name ? String(claims.name).slice(0, 255) : null, picture: claims.picture ? String(claims.picture).slice(0, 1000) : null };
}

export const adminEmails = () => (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
