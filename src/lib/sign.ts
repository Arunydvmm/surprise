import { createHmac, timingSafeEqual } from "crypto";

/** Shared HMAC helpers for the short-lived signed cookies (OAuth state, unlock tokens). */
export function secret(): string {
  const s = process.env.SITE_COOKIE_SECRET;
  if (!s || s.length < 16) throw new Error("SITE_COOKIE_SECRET is missing or shorter than 16 characters");
  return s;
}
export const hmac = (label: string, value: string) => createHmac("sha256", secret()).update(label + "|" + value).digest("hex");
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");
