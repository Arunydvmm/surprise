import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db, RowDataPacket } from "@/lib/db";
import { adminErr, requireAdmin } from "@/lib/admin-guard";
import { listOccasions, listThemes } from "@/lib/catalog";
import { readJsonLimited } from "@/lib/request-security";
import { FONT_OK, HEX, THEME_ID } from "@/lib/themes";
import { EFFECTS, STAGE_TYPES } from "@/lib/stages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = (v: unknown) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(-100000, Math.min(100000, n)) : 0; };

function cleanTheme(b: any, id: string) {
  const out: any = { id, name: str(b.name, 100), emoji: str(b.emoji, 16) || "🎁", font: str(b.font, 300), enabled: b.enabled ? 1 : 0, sort_order: int(b.sort_order) };
  if (!out.name) throw new Error("Give the theme a name.");
  for (const k of ["roseink", "berry", "petal", "blush", "cream", "bg"]) {
    if (!HEX.test(String(b[k]))) throw new Error(`"${k}" must be a colour like #b84e73.`);
    out[k] = String(b[k]).toLowerCase();
  }
  if (!FONT_OK.test(out.font)) throw new Error("Font can only use letters, numbers, spaces, commas, dots, dashes and quotes.");
  return out;
}

function cleanOccasion(b: any) {
  const slug = str(b.slug, 60).toLowerCase();
  if (!THEME_ID.test(slug)) throw new Error("Slug must be lowercase letters, numbers and dashes (2 to 40 characters).");
  const name = str(b.name, 100);
  if (!name) throw new Error("Give the occasion a name.");
  const d = b.defaults && typeof b.defaults === "object" ? b.defaults : {};
  const defaults = { friend_nickname: str(d.friend_nickname, 200) || "{name}", welcome_title: str(d.welcome_title, 500), welcome_message: str(d.welcome_message, 2000), final_letter: str(d.final_letter, 5000) };
  const effects = (Array.isArray(b.effects) ? b.effects : []).filter((e: unknown) => (EFFECTS as readonly string[]).includes(e as string));
  const rawStages = Array.isArray(b.stages) ? b.stages : [];
  if (!rawStages.length || rawStages.length > 30) throw new Error("A template needs between 1 and 30 slides.");
  const stages = rawStages.map((s: any, i: number) => {
    if (!(STAGE_TYPES as readonly string[]).includes(s?.type)) throw new Error(`Slide ${i + 1} has an unknown type.`);
    const options: Record<string, string> = {};
    if (s.options && typeof s.options === "object") for (const [k, v] of Object.entries(s.options)) if (typeof v === "string" && /^[A-Za-z_]{1,40}$/.test(k) && v.trim()) options[k] = v.slice(0, 500);
    return {
      type: s.type, title: str(s.title, 500), subtitle: str(s.subtitle, 1000), button_text: str(s.button_text, 200) || "Continue",
      items: (Array.isArray(s.items) ? s.items : []).slice(0, 50).map((x: unknown) => str(x, 2000)).filter(Boolean), options
    };
  });
  return { slug, name, emoji: str(b.emoji, 16) || "🎁", description: str(b.description, 300), theme_id: str(b.theme_id, 40) || null, defaults, effects, stages, enabled: b.enabled ? 1 : 0, sort_order: int(b.sort_order) };
}

export async function GET(req: Request, { params }: { params: { kind: string } }) {
  const a = await requireAdmin(req);
  if (a.res) return a.res;
  if (params.kind === "themes") return NextResponse.json({ items: await listThemes() });
  if (params.kind === "occasions") return NextResponse.json({ items: await listOccasions() });
  return adminErr("Unknown list.", 404);
}

/** POST creates, PUT updates, DELETE removes. */
async function write(req: Request, kind: string) {
  const a = await requireAdmin(req);
  if (a.res) return a.res;
  let b: any;
  try { b = await readJsonLimited<any>(req, 400_000); } catch { return adminErr("Request is too large.", 413); }
  if (!b || typeof b !== "object") return adminErr("Invalid request.");
  const pool = await db();
  try {
    if (kind === "themes") {
      if (req.method === "DELETE") {
        const [n] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM themes"); if (Number(n[0].n) <= 1) return adminErr("Keep at least one theme.");
        await pool.query("DELETE FROM themes WHERE id = ?", [String(b.id)]); return NextResponse.json({ ok: true });
      }
      const id = req.method === "POST" ? str(b.id, 40).toLowerCase() : String(b.id || "");
      if (!THEME_ID.test(id)) return adminErr("Theme id must be lowercase letters, numbers and dashes (2 to 40 characters).");
      const t = cleanTheme(b, id);
      if (req.method === "POST") await pool.query("INSERT INTO themes (id, name, emoji, roseink, berry, petal, blush, cream, bg, font, enabled, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", [t.id, t.name, t.emoji, t.roseink, t.berry, t.petal, t.blush, t.cream, t.bg, t.font, t.enabled, t.sort_order]);
      else await pool.query("UPDATE themes SET name=?, emoji=?, roseink=?, berry=?, petal=?, blush=?, cream=?, bg=?, font=?, enabled=?, sort_order=? WHERE id=?", [t.name, t.emoji, t.roseink, t.berry, t.petal, t.blush, t.cream, t.bg, t.font, t.enabled, t.sort_order, t.id]);
      return NextResponse.json({ ok: true });
    }
    if (kind === "occasions") {
      if (req.method === "DELETE") {
        const id = String(b.id || "");
        await pool.query("UPDATE surprises SET occasion_id = NULL WHERE occasion_id = ?", [id]); // existing surprises keep working
        await pool.query("DELETE FROM occasions WHERE id = ?", [id]); return NextResponse.json({ ok: true });
      }
      const o = cleanOccasion(b);
      if (o.theme_id) { const [t] = await pool.query<RowDataPacket[]>("SELECT 1 FROM themes WHERE id = ?", [o.theme_id]); if (!t.length) return adminErr("That theme does not exist."); }
      const vals = [o.slug, o.name, o.emoji, o.description, o.theme_id, JSON.stringify(o.defaults), JSON.stringify(o.effects), JSON.stringify(o.stages), o.enabled, o.sort_order];
      if (req.method === "POST") await pool.query("INSERT INTO occasions (id, slug, name, emoji, description, theme_id, defaults, effects, stages, enabled, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [randomUUID(), ...vals]);
      else await pool.query("UPDATE occasions SET slug=?, name=?, emoji=?, description=?, theme_id=?, defaults=?, effects=?, stages=?, enabled=?, sort_order=? WHERE id=?", [...vals, String(b.id || "")]);
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    if (e?.code === "ER_DUP_ENTRY") return adminErr("That slug / id is already used.", 409);
    if (e instanceof Error && !("code" in e)) return adminErr(e.message);
    console.error("[admin-catalog] failed:", e);
    return adminErr("Could not save.", 500);
  }
  return adminErr("Unknown list.", 404);
}
export const POST = (req: Request, c: { params: { kind: string } }) => write(req, c.params.kind);
export const PUT = (req: Request, c: { params: { kind: string } }) => write(req, c.params.kind);
export const DELETE = (req: Request, c: { params: { kind: string } }) => write(req, c.params.kind);
