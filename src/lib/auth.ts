import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db, RowDataPacket } from "@/lib/db";

export const SESSION_COOKIE = "s4u_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionUser = { id: string; email: string; name: string | null; avatar_url: string | null; role: "user" | "admin" };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const sessionCookieOptions = () => ({
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SESSION_TTL_MS / 1000
});

/** Creates a server-side session. Only a hash of the token is stored, so a database leak cannot be replayed. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const pool = await db();
  await pool.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)", [sha256(token), userId, Date.now() + SESSION_TTL_MS]);
  if (Math.random() < 0.05) pool.query("DELETE FROM sessions WHERE expires_at < ?", [Date.now()]).catch(() => {});
  return token;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  try { const pool = await db(); await pool.query("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]); } catch {}
}

/** The signed-in user for this request, or null. Blocked users never get a session back. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  try {
    const pool = await db();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT u.id, u.email, u.name, u.avatar_url, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_blocked = 0 LIMIT 1",
      [sha256(token), Date.now()]);
    const u = rows[0];
    return u ? { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url, role: u.role === "admin" ? "admin" : "user" } : null;
  } catch { return null; }
}

export const isAdmin = (u: SessionUser | null) => !!u && u.role === "admin";
