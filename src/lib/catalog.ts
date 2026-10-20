import { db, parseJson, RowDataPacket } from "@/lib/db";
import { defaultPlatformSettings } from "@/lib/seed";
import { fallbackTheme, Theme } from "@/lib/themes";
import type { SeedStage } from "@/lib/seed";

export type Occasion = {
  id: string; slug: string; name: string; emoji: string; description: string; theme_id: string | null;
  defaults: { friend_nickname: string; welcome_title: string; welcome_message: string; final_letter: string };
  effects: string[]; stages: SeedStage[]; enabled: boolean; sort_order: number;
};

const toTheme = (r: RowDataPacket): Theme => ({ id: r.id, name: r.name, emoji: r.emoji, roseink: r.roseink, berry: r.berry, petal: r.petal, blush: r.blush, cream: r.cream, bg: r.bg, font: r.font, enabled: !!r.enabled, sort_order: r.sort_order });
const toOccasion = (r: RowDataPacket): Occasion => ({
  id: r.id, slug: r.slug, name: r.name, emoji: r.emoji, description: r.description, theme_id: r.theme_id,
  defaults: { friend_nickname: "{name}", welcome_title: "", welcome_message: "", final_letter: "", ...(parseJson(r.defaults, {}) as object) },
  effects: parseJson(r.effects, []) as string[], stages: parseJson(r.stages, []) as SeedStage[], enabled: !!r.enabled, sort_order: r.sort_order
});

export async function listThemes(enabledOnly = false): Promise<Theme[]> {
  const pool = await db();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM themes ${enabledOnly ? "WHERE enabled = 1" : ""} ORDER BY sort_order, name`);
  return rows.map(toTheme);
}

/** Theme by id; falls back to the platform default theme, then the first theme, then a built-in one. */
export async function pickTheme(id?: string | null): Promise<Theme> {
  try {
    const pool = await db();
    if (id) { const [r] = await pool.query<RowDataPacket[]>("SELECT * FROM themes WHERE id = ?", [id]); if (r[0]) return toTheme(r[0]); }
    const settings = await getPlatformSettings();
    const [d] = await pool.query<RowDataPacket[]>("SELECT * FROM themes WHERE id = ?", [settings.default_theme_id]);
    if (d[0]) return toTheme(d[0]);
    const [f] = await pool.query<RowDataPacket[]>("SELECT * FROM themes WHERE enabled = 1 ORDER BY sort_order LIMIT 1");
    if (f[0]) return toTheme(f[0]);
  } catch {}
  return fallbackTheme;
}

export async function listOccasions(enabledOnly = false): Promise<Occasion[]> {
  const pool = await db();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM occasions ${enabledOnly ? "WHERE enabled = 1" : ""} ORDER BY sort_order, name`);
  return rows.map(toOccasion);
}

export async function getOccasion(id: string): Promise<Occasion | null> {
  const pool = await db();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM occasions WHERE id = ?", [id]);
  return rows[0] ? toOccasion(rows[0]) : null;
}

/** Platform settings: values saved by an admin, with the starter defaults filling any gap. */
export async function getPlatformSettings(): Promise<Record<string, string>> {
  const out: Record<string, string> = { ...defaultPlatformSettings };
  try {
    const pool = await db();
    const [rows] = await pool.query<RowDataPacket[]>("SELECT `key`, `value` FROM platform_settings");
    for (const r of rows) out[r.key] = r.value;
  } catch {}
  return out;
}

export function parseList<T>(raw: string | undefined, fallback: T[]): T[] {
  try { const v = JSON.parse(raw || ""); return Array.isArray(v) ? v : fallback; } catch { return fallback; }
}

export function getLimits(s: Record<string, string>) {
  const n = (v: string, d: number) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? x : d; };
  return { maxSurprises: n(s.max_surprises_per_user, 5), maxStorageBytes: n(s.max_storage_mb, 100) * 1024 * 1024 };
}
