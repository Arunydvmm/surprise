import { NextResponse } from "next/server";
import { db, FILE_BUCKETS, isBucket } from "@/lib/db";
import { hasAdminAccess } from "@/lib/admin-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (message: string, status = 400) => NextResponse.json({ data: null, error: { message } }, { status });

export async function POST(req: Request) {
  if (!(await hasAdminAccess())) return fail("Not signed in as admin.", 401);
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Invalid upload.");
  const file = form.get("file"), path = String(form.get("path") || ""), bucket = String(form.get("bucket") || "memory-photos");
  if (!(file instanceof File)) return fail("No file received.");
  if (!isBucket(bucket)) return fail("Unknown bucket.");
  const rule = FILE_BUCKETS[bucket];
  if (!rule.path.test(path)) return fail("Bad file path.");
  if (file.size > rule.maxBytes) return fail(`File is too large (max ${Math.round(rule.maxBytes / 1048576)} MB).`);
  const mime = (file.type || "").toLowerCase();
  if (!rule.mime.test(mime)) return fail("That file type is not allowed.");
  try {
    const pool = await db();
    const buf = Buffer.from(await file.arrayBuffer());
    await pool.execute(
      "INSERT INTO files (bucket, path, mime, size, data) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE mime = VALUES(mime), size = VALUES(size), data = VALUES(data)",
      [bucket, path, mime, buf.length, buf]
    );
    return NextResponse.json({ data: { path }, error: null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/max_allowed_packet/i.test(msg)) return fail("Database rejected the file: raise MySQL max_allowed_packet to at least 32M.", 500);
    return fail("Could not save the file to the database.", 500);
  }
}
