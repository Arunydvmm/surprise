import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminEmails, appOrigin, exchangeCode, OAUTH_COOKIE, readOAuthState } from "@/lib/google";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { db, RowDataPacket } from "@/lib/db";
import { safeEqual } from "@/lib/sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cookieHeader = (req: Request, name: string) => (req.headers.get("cookie") || "").split(/;\s*/).find(c => c.startsWith(name + "="))?.slice(name.length + 1);

/** Step 2: Google sends the visitor back here with a code. */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const fail = (code: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${code}`, origin));
    res.cookies.set(OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return res;
  };
  const q = new URL(req.url).searchParams;
  if (q.get("error")) return fail("cancelled");
  const st = readOAuthState(cookieHeader(req, OAUTH_COOKIE));
  const code = q.get("code"), state = q.get("state") || "";
  if (!st || !code || !safeEqual(state, st.state)) return fail("state");

  try {
    const profile = await exchangeCode(req, code, st);
    const pool = await db();
    const isAdminEmail = adminEmails().includes(profile.email);
    const [found] = await pool.query<RowDataPacket[]>("SELECT * FROM users WHERE google_sub = ? OR email = ? ORDER BY (google_sub = ?) DESC LIMIT 1", [profile.sub, profile.email, profile.sub]);
    let user: { id: string; is_blocked?: number } | undefined = found[0] as any;
    if (user) {
      if (user.is_blocked) return fail("blocked");
      await pool.query("UPDATE users SET google_sub = ?, email = ?, name = ?, avatar_url = ?, last_login_at = NOW(), role = IF(?, 'admin', role) WHERE id = ?",
        [profile.sub, profile.email, profile.name, profile.picture, isAdminEmail ? 1 : 0, user.id]);
    } else {
      const id = randomUUID();
      await pool.query("INSERT INTO users (id, google_sub, email, name, avatar_url, role, last_login_at) VALUES (?,?,?,?,?,?,NOW())",
        [id, profile.sub, profile.email, profile.name, profile.picture, isAdminEmail ? "admin" : "user"]);
      user = { id };
    }
    const uid = user.id;
    // The first admin to sign in adopts the surprise that existed before accounts were introduced.
    if (isAdminEmail) await pool.query("UPDATE surprises SET owner_id = ? WHERE owner_id IS NULL AND is_legacy = 1", [uid]);

    const token = await createSession(uid);
    const res = NextResponse.redirect(new URL(st.next, origin));
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    res.cookies.set(OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("[auth] google sign-in failed:", e);
    return fail("google_failed");
  }
}
