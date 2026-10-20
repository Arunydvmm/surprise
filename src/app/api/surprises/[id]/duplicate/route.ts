import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db, parseJson, RowDataPacket } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManage, getSurpriseById } from "@/lib/surprises";
import { getLimits, getPlatformSettings } from "@/lib/catalog";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Copies settings, slides and memory text. Photos and music are not copied, and the copy starts unpublished. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return err("Please sign in again.", 401);
  if (!isSameOrigin(req)) return err("Cross-origin request blocked.", 403);
  const src = await getSurpriseById(params.id);
  if (!src || !canManage(user, src)) return err("Surprise not found.", 404);

  const pool = await db();
  if (user.role !== "admin") {
    const limits = getLimits(await getPlatformSettings());
    const [cnt] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM surprises WHERE owner_id = ?", [user.id]);
    if (Number(cnt[0].n) >= limits.maxSurprises) return err(`You have reached the limit of ${limits.maxSurprises} surprises.`, 403);
  }
  const id = randomUUID(), slug = `${src.slug.slice(0, 30)}-copy-${randomUUID().slice(0, 4)}`;
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    await c.query("INSERT INTO surprises (id, owner_id, slug, title, occasion_id, password_hash, password_version, is_published) VALUES (?,?,?,?,?,?,1,0)",
      [id, user.id, slug, (src.title + " (copy)").slice(0, 80), src.occasion_id, src.password_hash]);
    await c.query("INSERT INTO surprise_settings (surprise_id, `key`, `value`) SELECT ?, `key`, `value` FROM surprise_settings WHERE surprise_id = ?", [id, src.id]);
    const [stages] = await c.query<RowDataPacket[]>("SELECT * FROM stages WHERE surprise_id = ? ORDER BY sort_order", [src.id]);
    for (const st of stages) {
      const { music_path, music_title, ...opts } = parseJson(st.options, {}) as Record<string, string>;
      await c.query("INSERT INTO stages (id, surprise_id, type, title, subtitle, button_text, items, options, enabled, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [randomUUID(), id, st.type, st.title, st.subtitle, st.button_text, JSON.stringify(parseJson(st.items, [])), JSON.stringify(opts), st.enabled, st.sort_order]);
    }
    const [mems] = await c.query<RowDataPacket[]>("SELECT title, story, happened_on, sort_order FROM memories WHERE surprise_id = ? ORDER BY sort_order", [src.id]);
    for (const m of mems) await c.query("INSERT INTO memories (id, surprise_id, title, story, happened_on, is_published, sort_order) VALUES (?,?,?,?,?,0,?)", [randomUUID(), id, m.title, m.story, m.happened_on, m.sort_order]);
    await c.commit();
  } catch (e) { await c.rollback(); console.error("[surprises] duplicate failed:", e); return err("Could not duplicate.", 500); } finally { c.release(); }
  return NextResponse.json({ id, slug });
}
