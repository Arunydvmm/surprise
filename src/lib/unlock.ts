import { cookies } from "next/headers";
import { hmac, safeEqual } from "@/lib/sign";

export const UNLOCK_TTL_SECONDS = 7 * 24 * 60 * 60;

/** One cookie per surprise, so unlocking one link never unlocks another. */
export const unlockCookieName = (surpriseId: string) => `s4u_u_${surpriseId.replace(/-/g, "").slice(0, 12)}`;

export function createUnlockToken(surpriseId: string, passwordVersion: number) {
  const v = `${surpriseId}.${passwordVersion}.${Date.now() + UNLOCK_TTL_SECONDS * 1000}`;
  return `${v}.${hmac("unlock", v)}`;
}

export function verifyUnlockToken(token: string | undefined, surpriseId: string, passwordVersion: number) {
  try {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 4) return false;
    const [id, ver, exp, sig] = parts;
    if (id !== surpriseId || ver !== String(passwordVersion)) return false;
    if (!Number.isFinite(Number(exp)) || Number(exp) < Date.now()) return false;
    return safeEqual(sig, hmac("unlock", `${id}.${ver}.${exp}`));
  } catch { return false; }
}

export async function hasUnlock(s: { id: string; password_version: number }) {
  return verifyUnlockToken(cookies().get(unlockCookieName(s.id))?.value, s.id, s.password_version);
}
