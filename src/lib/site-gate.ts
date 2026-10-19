import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "bestie-surprise-access";
const DAY = 60 * 60 * 24;

function signature(value: string) {
  const secret = process.env.SITE_COOKIE_SECRET;
  if (!secret) throw new Error("SITE_COOKIE_SECRET is missing");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function validPassword(password: string) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createGateToken() {
  const value = `${Date.now() + DAY * 1000}`;
  return `${value}.${signature(value)}`;
}

export function verifyGateToken(token?: string) {
  if (!token || !process.env.SITE_COOKIE_SECRET) return false;
  const [value, sig] = token.split(".");
  if (!value || !sig || Number(value) < Date.now()) return false;
  const expected = signature(value);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hasSiteAccess() {
  const jar = cookies();
  return verifyGateToken(jar.get(COOKIE)?.value);
}

export const gateCookieName = COOKIE;
