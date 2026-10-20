import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
export const adminCookieName = "bestie-admin-access";
const TTL_MS = 12 * 60 * 60 * 1000;
function sig(value: string) {
  const secret = process.env.SITE_COOKIE_SECRET;
  if (!secret) throw new Error("SITE_COOKIE_SECRET is missing");
  return createHmac("sha256", secret).update("admin|" + value).digest("hex");
}
const digest = (s: string) => createHmac("sha256", "cmp").update(s).digest();
export function validAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  return timingSafeEqual(digest(password), digest(expected));
}
export function createAdminToken() { const v = `${Date.now() + TTL_MS}`; return `${v}.${sig(v)}`; }
export function verifyAdminToken(token?: string) {
  if (!token || !process.env.SITE_COOKIE_SECRET) return false;
  const [v, s] = token.split(".");
  if (!v || !s || !/^\d{13}$/.test(v) || !Number.isSafeInteger(Number(v)) || Number(v) < Date.now() || Number(v) > Date.now() + TTL_MS + 60_000) return false;
  const a = Buffer.from(s), b = Buffer.from(sig(v));
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function hasAdminAccess() { return verifyAdminToken(cookies().get(adminCookieName)?.value); }
