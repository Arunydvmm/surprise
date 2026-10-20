import { db, RowDataPacket } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { hasUnlock } from "@/lib/unlock";

export type Surprise = { id: string; owner_id: string | null; slug: string; title: string; occasion_id: string | null; password_hash: string | null; password_version: number; is_published: boolean; is_legacy: boolean };

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const toSurprise = (r: RowDataPacket): Surprise => ({ id: r.id, owner_id: r.owner_id, slug: r.slug, title: r.title, occasion_id: r.occasion_id, password_hash: r.password_hash, password_version: Number(r.password_version), is_published: !!r.is_published, is_legacy: !!r.is_legacy });

export async function getSurpriseBySlug(slug: string): Promise<Surprise | null> {
  if (!SLUG_RE.test(slug)) return null;
  const pool = await db();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM surprises WHERE slug = ?", [slug]);
  return rows[0] ? toSurprise(rows[0]) : null;
}
export async function getSurpriseById(id: string): Promise<Surprise | null> {
  if (typeof id !== "string" || id.length !== 36) return null;
  const pool = await db();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM surprises WHERE id = ?", [id]);
  return rows[0] ? toSurprise(rows[0]) : null;
}

/** The owner and any admin can manage a surprise. Everyone else cannot. */
export const canManage = (user: SessionUser | null, s: Surprise) => !!user && (user.role === "admin" || (!!s.owner_id && s.owner_id === user.id));

/** Can this visitor see the surprise content? Owners and admins always; others need the password cookie and a published surprise. */
export async function canView(user: SessionUser | null, s: Surprise): Promise<"manager" | "unlocked" | null> {
  if (canManage(user, s)) return "manager";
  if (!s.is_published) return null;
  return (await hasUnlock(s)) ? "unlocked" : null;
}

export async function getSettingsFor(id: string): Promise<Record<string, string>> {
  const pool = await db();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT `key`, `value` FROM surprise_settings WHERE surprise_id = ?", [id]);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export async function ownerStorageUsed(ownerId: string): Promise<number> {
  const pool = await db();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT COALESCE(SUM(f.size), 0) AS n FROM files f JOIN surprises s ON s.id = f.surprise_id WHERE s.owner_id = ?", [ownerId]);
  return Number(rows[0]?.n || 0);
}

/** Deletes a surprise and everything that belongs to it. */
export async function deleteSurpriseCascade(id: string) {
  const pool = await db();
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    for (const t of ["files", "memory_photos", "memories", "stages", "surprise_settings"]) await c.query(`DELETE FROM \`${t}\` WHERE surprise_id = ?`, [id]);
    await c.query("DELETE FROM surprises WHERE id = ?", [id]);
    await c.commit();
  } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
}

export function slugify(input: string) {
  const s = input.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30).replace(/-+$/g, "");
  return s.length >= 3 ? s : "surprise";
}
export const fillName = (text: string, name: string) => String(text ?? "").split("{name}").join(name);
