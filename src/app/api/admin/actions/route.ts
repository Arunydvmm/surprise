import { NextResponse } from "next/server";
import { db, RowDataPacket } from "@/lib/db";
import { adminErr, requireAdmin } from "@/lib/admin-guard";
import { deleteSurpriseCascade, getSurpriseById } from "@/lib/surprises";
import { readJsonLimited } from "@/lib/request-security";
import { adminEmails } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One endpoint for the small admin actions: block users, change roles, publish / unpublish / delete surprises. */
export async function POST(req: Request) {
  const a = await requireAdmin(req);
  if (a.res) return a.res;
  let b: any;
  try { b = await readJsonLimited<any>(req, 5_000); } catch { return adminErr("Invalid request.", 413); }
  if (!b || typeof b !== "object" || typeof b.id !== "string" || b.id.length !== 36) return adminErr("Invalid request.");
  const pool = await db();

  switch (b.action) {
    case "user.block": {
      if (b.id === a.user.id) return adminErr("You cannot block yourself.");
      const [r] = await pool.query<RowDataPacket[]>("SELECT email FROM users WHERE id = ?", [b.id]);
      if (!r[0]) return adminErr("User not found.", 404);
      if (adminEmails().includes(String(r[0].email).toLowerCase())) return adminErr("This account is listed in ADMIN_EMAILS and cannot be blocked.");
      const blocked = b.value ? 1 : 0;
      await pool.query("UPDATE users SET is_blocked = ? WHERE id = ?", [blocked, b.id]);
      if (blocked) await pool.query("DELETE FROM sessions WHERE user_id = ?", [b.id]); // sign them out everywhere
      return NextResponse.json({ ok: true });
    }
    case "user.role": {
      if (b.id === a.user.id) return adminErr("You cannot change your own role.");
      const [r] = await pool.query<RowDataPacket[]>("SELECT email FROM users WHERE id = ?", [b.id]);
      if (!r[0]) return adminErr("User not found.", 404);
      if (adminEmails().includes(String(r[0].email).toLowerCase())) return adminErr("This account is listed in ADMIN_EMAILS. Remove it there to change its role.");
      await pool.query("UPDATE users SET role = ? WHERE id = ?", [b.value === "admin" ? "admin" : "user", b.id]);
      return NextResponse.json({ ok: true });
    }
    case "surprise.publish": {
      const s = await getSurpriseById(b.id);
      if (!s) return adminErr("Surprise not found.", 404);
      if (b.value && !s.password_hash) return adminErr("This surprise has no password yet, so it cannot be published.");
      await pool.query("UPDATE surprises SET is_published = ? WHERE id = ?", [b.value ? 1 : 0, b.id]);
      return NextResponse.json({ ok: true });
    }
    case "surprise.delete": {
      if (!(await getSurpriseById(b.id))) return adminErr("Surprise not found.", 404);
      await deleteSurpriseCascade(b.id);
      return NextResponse.json({ ok: true });
    }
    default: return adminErr("Unknown action.");
  }
}
