import { db, RowDataPacket } from "@/lib/db";

/**
 * Rate limiting stored in MySQL, so it is shared by every app instance and survives restarts.
 * If the database is unreachable it falls back to an in-memory counter.
 */
type Hit = { count: number; reset: number };
const g = globalThis as typeof globalThis & { __s4uHits?: Map<string, Hit> };
const mem = (g.__s4uHits ||= new Map<string, Hit>());

/**
 * Client IP. TRUSTED_PROXY_HOPS is how many reverse proxies sit in front of the app (Railway = 1,
 * Cloudflare + Railway = 2). We read the entry added by the nearest trusted proxy, so a client cannot
 * pick its own IP by sending an X-Forwarded-For header.
 */
export function clientIp(req: Request) {
  const hops = Math.max(0, Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 0);
  const parts = (req.headers.get("x-forwarded-for") || "").split(",").map(s => s.trim()).filter(Boolean);
  const ip = hops > 0 && parts.length ? parts[Math.max(0, parts.length - hops)] : req.headers.get("x-real-ip") || "unknown";
  return ip.length > 64 ? ip.slice(0, 64) : ip || "unknown";
}

/** Returns true if the caller is over the limit. */
export async function limited(key: string, max = 10, windowMs = 10 * 60 * 1000): Promise<boolean> {
  const now = Date.now(), k = key.slice(0, 190);
  try {
    const pool = await db();
    await pool.query(
      "INSERT INTO rate_limits (k, hits, reset_at) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE hits = IF(reset_at < ?, 1, hits + 1), reset_at = IF(reset_at < ?, ?, reset_at)",
      [k, now + windowMs, now, now, now + windowMs]);
    const [rows] = await pool.query<RowDataPacket[]>("SELECT hits FROM rate_limits WHERE k = ?", [k]);
    if (Math.random() < 0.02) pool.query("DELETE FROM rate_limits WHERE reset_at < ?", [now]).catch(() => {});
    return Number(rows[0]?.hits || 0) > max;
  } catch {
    if (mem.size > 5000) { for (const [x, v] of mem) if (v.reset < now) mem.delete(x); }
    const h = mem.get(k);
    if (!h || h.reset < now) { mem.set(k, { count: 1, reset: now + windowMs }); return false; }
    h.count++;
    return h.count > max;
  }
}

export async function clearLimit(key: string) {
  mem.delete(key.slice(0, 190));
  try { const pool = await db(); await pool.query("DELETE FROM rate_limits WHERE k = ?", [key.slice(0, 190)]); } catch {}
}
