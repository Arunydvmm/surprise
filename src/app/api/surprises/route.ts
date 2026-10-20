import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db, RowDataPacket } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fillName, SLUG_RE, slugify } from "@/lib/surprises";
import { getLimits, getOccasion, getPlatformSettings, pickTheme } from "@/lib/catalog";
import { fallbackDefaults, fallbackStages } from "@/lib/seed";
import { hashPassword, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password";
import { isSameOrigin, readJsonLimited } from "@/lib/request-security";
import { clientIp, limited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Creates a surprise from an occasion template. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return err("Please sign in again.", 401);
  if (!isSameOrigin(req)) return err("Cross-origin request blocked.", 403);
  if (await limited("create:" + user.id, 30, 60 * 60 * 1000)) return err("Slow down a little and try again soon.", 429);

  let b: any;
  try { b = await readJsonLimited<any>(req, 10_000); } catch { return err("Invalid request.", 413); }
  if (!b || typeof b !== "object") return err("Invalid request.");
  const name = String(b.recipient_name || "").trim().slice(0, 60);
  const password = String(b.password || "");
  if (!name) return err("Enter the name of the person this is for.");
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return err(`Choose a password between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`);

  const settings = await getPlatformSettings();
  const limits = getLimits(settings);
  const pool = await db();
  if (user.role !== "admin") {
    const [cnt] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM surprises WHERE owner_id = ?", [user.id]);
    if (Number(cnt[0].n) >= limits.maxSurprises) return err(`You have reached the limit of ${limits.maxSurprises} surprises. Delete one to make a new one.`, 403);
  }

  const occasion = b.occasion_id ? await getOccasion(String(b.occasion_id)) : null;
  if (b.occasion_id && (!occasion || !occasion.enabled)) return err("That occasion is not available.");
  const defaults = occasion?.defaults || fallbackDefaults;
  const stages = occasion?.stages?.length ? occasion.stages : fallbackStages;
  const theme = await pickTheme(occasion?.theme_id);

  const title = String(b.title || "").trim().slice(0, 80) || `${occasion?.name || "Surprise"} for ${name}`;
  let slug = String(b.slug || "").trim().toLowerCase();
  if (!slug) slug = `${slugify(title)}-${randomUUID().slice(0, 4)}`;
  if (!SLUG_RE.test(slug)) return err("The link can use lowercase letters, numbers and dashes (3 to 40 characters).");

  const id = randomUUID();
  const hash = await hashPassword(password);
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    await c.query("INSERT INTO surprises (id, owner_id, slug, title, occasion_id, password_hash, password_version, is_published) VALUES (?,?,?,?,?,?,1,0)",
      [id, user.id, slug, title, occasion?.id || null, hash]);
    const settingRows: [string, string][] = [
      ["friend_nickname", fillName(defaults.friend_nickname || "{name}", name)],
      ["welcome_title", fillName(defaults.welcome_title, name)], ["welcome_message", fillName(defaults.welcome_message, name)],
      ["final_letter", fillName(defaults.final_letter, name)], ["theme", theme.id], ["effects", (occasion?.effects || ["hearts", "confetti"]).join(",")]
    ];
    for (const [k, v] of settingRows) await c.query("INSERT INTO surprise_settings (surprise_id, `key`, `value`) VALUES (?,?,?)", [id, k, v]);
    let order = 0;
    for (const st of stages) {
      await c.query("INSERT INTO stages (id, surprise_id, type, title, subtitle, button_text, items, options, enabled, sort_order) VALUES (?,?,?,?,?,?,?,?,1,?)",
        [randomUUID(), id, st.type, fillName(st.title, name), fillName(st.subtitle, name), fillName(st.button_text, name),
          JSON.stringify((st.items || []).map(x => fillName(x, name))), JSON.stringify(st.options || {}), order++]);
    }
    await c.commit();
  } catch (e: any) {
    await c.rollback();
    if (e?.code === "ER_DUP_ENTRY") return err("That link name is already taken. Try another one.", 409);
    console.error("[surprises] create failed:", e);
    return err("Could not create the surprise.", 500);
  } finally { c.release(); }
  return NextResponse.json({ id, slug });
}
