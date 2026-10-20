import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";

export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 100;

const scrypt = (pw: string, salt: Buffer, len: number) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(pw, salt, len, (e, k) => (e ? reject(e) : resolve(k as Buffer))));

/** Format: s1$<salt b64>$<hash b64>. Passwords are never stored in plain text. */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 32);
  return `s1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || !pw) return false;
  const [v, s, h] = stored.split("$");
  if (v !== "s1" || !s || !h) return false;
  const expected = Buffer.from(h, "base64");
  const got = await scrypt(pw, Buffer.from(s, "base64"), expected.length);
  return got.length === expected.length && timingSafeEqual(got, expected);
}
