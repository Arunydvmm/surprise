import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminErr, requireAdmin } from "@/lib/admin-guard";
import { getPlatformSettings } from "@/lib/catalog";
import { defaultPlatformSettings } from "@/lib/seed";
import { readJsonLimited } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_LISTS = new Set(["landing_steps", "landing_features", "landing_faq"]);
const NUMBERS = new Set(["max_surprises_per_user", "max_storage_mb"]);

export async function GET(req: Request) {
  const a = await requireAdmin(req);
  if (a.res) return a.res;
  return NextResponse.json({ settings: await getPlatformSettings() });
}

export async function PUT(req: Request) {
  const a = await requireAdmin(req);
  if (a.res) return a.res;
  let b: any;
  try { b = await readJsonLimited<any>(req, 200_000); } catch { return adminErr("Request is too large.", 413); }
  if (!b || typeof b.settings !== "object") return adminErr("Invalid request.");
  const pool = await db();
  for (const [k, raw] of Object.entries(b.settings as Record<string, unknown>)) {
    if (!(k in defaultPlatformSettings)) continue; // only known keys can be written
    let v = typeof raw === "string" ? raw : "";
    if (v.length > 50_000) return adminErr(`"${k}" is too long.`);
    if (NUMBERS.has(k) && !(Number.isFinite(Number(v)) && Number(v) >= 0)) return adminErr(`"${k}" must be a number, 0 or more.`);
    if (JSON_LISTS.has(k)) { try { if (!Array.isArray(JSON.parse(v))) throw 0; } catch { return adminErr(`"${k}" is not a valid list.`); } }
    if (k === "demo_url" && v && !/^https?:\/\//i.test(v.trim())) return adminErr("Example link must start with http:// or https://");
    await pool.query("INSERT INTO platform_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [k, v.trim()]);
  }
  return NextResponse.json({ ok: true });
}
