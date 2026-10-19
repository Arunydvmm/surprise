// Tiny in-memory limiter (fine for a single Render instance). Slows down password guessing.
type Hit = { count: number; reset: number };
const g = globalThis as typeof globalThis & { __bestieHits?: Map<string, Hit> };
const hits = (g.__bestieHits ||= new Map<string, Hit>());

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") || "unknown").trim();
}

/** Returns true if the caller is over the limit. */
export function limited(key: string, max = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { count: 1, reset: now + windowMs }); return false; }
  h.count++;
  return h.count > max;
}
export const clearLimit = (key: string) => hits.delete(key);
