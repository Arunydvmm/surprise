// Tiny in-memory limiter (fine for a single Render instance). Slows down password guessing.
type Hit = { count: number; reset: number };
const g = globalThis as typeof globalThis & { __bestieHits?: Map<string, Hit> };
const hits = (g.__bestieHits ||= new Map<string, Hit>());

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  const candidate = (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") || "unknown").trim();
  // Keep keys bounded and avoid attacker-controlled, arbitrarily long values.
  return candidate.length > 64 ? candidate.slice(0, 64) : candidate || "unknown";
}

/** Returns true if the caller is over the limit. */
export function limited(key: string, max = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    // Prevent unbounded growth if an attacker rotates source addresses.
    while (hits.size > 6000) hits.delete(hits.keys().next().value as string);
  }
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { count: 1, reset: now + windowMs }); return false; }
  h.count++;
  return h.count > max;
}
export const clearLimit = (key: string) => hits.delete(key);
