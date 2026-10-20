import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManage, deleteSurpriseCascade, getSurpriseById, SLUG_RE } from "@/lib/surprises";
import { hashPassword, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/password";
import { isSameOrigin, readJsonLimited } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

async function load(req: Request, id: string) {
  const user = await getSessionUser();
  if (!user) return { res: err("Please sign in again.", 401) };
  if (!isSameOrigin(req)) return { res: err("Cross-origin request blocked.", 403) };
  const s = await getSurpriseById(id);
  if (!s || !canManage(user, s)) return { res: err("Surprise not found.", 404) };
  return { user, s };
}

/** Title, link, password and published state. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const r = await load(req, params.id);
  if (r.res) return r.res;
  const s = r.s!;
  let b: any;
  try { b = await readJsonLimited<any>(req, 10_000); } catch { return err("Invalid request.", 413); }
  if (!b || typeof b !== "object") return err("Invalid request.");

  const sets: string[] = [], vals: unknown[] = [];
  if (typeof b.title === "string") { const t = b.title.trim().slice(0, 80); if (!t) return err("Title cannot be empty."); sets.push("title = ?"); vals.push(t); }
  if (typeof b.slug === "string" && b.slug !== s.slug) {
    const slug = b.slug.trim().toLowerCase();
    if (!SLUG_RE.test(slug)) return err("The link can use lowercase letters, numbers and dashes (3 to 40 characters).");
    sets.push("slug = ?"); vals.push(slug);
  }
  let hasPassword = !!s.password_hash;
  if (typeof b.password === "string" && b.password !== "") {
    if (b.password.length < PASSWORD_MIN || b.password.length > PASSWORD_MAX) return err(`Choose a password between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`);
    // A new password signs out everyone who had unlocked the old one.
    sets.push("password_hash = ?", "password_version = password_version + 1"); vals.push(await hashPassword(b.password));
    hasPassword = true;
  }
  if (typeof b.is_published === "boolean") {
    if (b.is_published && !hasPassword) return err("Set a password before publishing.");
    sets.push("is_published = ?"); vals.push(b.is_published ? 1 : 0);
  }
  if (!sets.length) return err("Nothing to change.");
  try {
    const pool = await db();
    await pool.query(`UPDATE surprises SET ${sets.join(", ")} WHERE id = ?`, [...vals, s.id]);
  } catch (e: any) {
    if (e?.code === "ER_DUP_ENTRY") return err("That link name is already taken. Try another one.", 409);
    console.error("[surprises] update failed:", e);
    return err("Could not save.", 500);
  }
  const fresh = await getSurpriseById(s.id);
  return NextResponse.json({ ok: true, slug: fresh?.slug, is_published: fresh?.is_published });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const r = await load(req, params.id);
  if (r.res) return r.res;
  try { await deleteSurpriseCascade(r.s!.id); } catch (e) { console.error("[surprises] delete failed:", e); return err("Could not delete.", 500); }
  return NextResponse.json({ ok: true });
}
