import { NextResponse } from "next/server";
import { db, FILE_BUCKETS, isBucket } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManage, getSurpriseById, ownerStorageUsed } from "@/lib/surprises";
import { getLimits, getPlatformSettings } from "@/lib/catalog";
import type { RowDataPacket } from "@/lib/db";
import { hasAllowedFileSignature, isSameOrigin, readBytesLimited } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (message: string, status = 400) => NextResponse.json({ data: null, error: { message } }, { status });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in again.", 401);
  if (!isSameOrigin(req)) return fail("Cross-origin request blocked.", 403);
  const contentLength = Number(req.headers.get("content-length") || 0);
  // Largest supported file is 15 MiB; allow a small multipart envelope.
  if (Number.isFinite(contentLength) && contentLength > 16 * 1024 * 1024) return fail("Upload request is too large.", 413);
  let rawBody: Uint8Array;
  try { rawBody = await readBytesLimited(req, 16 * 1024 * 1024); }
  catch { return fail("Upload request is too large or invalid.", 413); }
  const formRequest = new Request(req.url, { method: "POST", headers: req.headers, body: new Uint8Array(rawBody) });
  const form = await formRequest.formData().catch(() => null);
  if (!form) return fail("Invalid upload.");
  const file = form.get("file"), path = String(form.get("path") || ""), bucket = String(form.get("bucket") || "memory-photos");
  const surprise = await getSurpriseById(String(form.get("surprise_id") || ""));
  if (!surprise || !canManage(user, surprise)) return fail("Surprise not found.", 404);
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
    if (buf.length !== file.size || !hasAllowedFileSignature(buf, mime, bucket)) return fail("The file content does not match an allowed file type.");
    // Storage quota applies to the owner of the surprise. Admin-owned surprises are unlimited.
    if (surprise.owner_id) {
      const [ow] = await pool.query<RowDataPacket[]>("SELECT role FROM users WHERE id = ?", [surprise.owner_id]);
      if (ow[0]?.role !== "admin") {
        const limit = getLimits(await getPlatformSettings()).maxStorageBytes;
        const [old] = await pool.query<RowDataPacket[]>("SELECT size FROM files WHERE surprise_id = ? AND bucket = ? AND path = ?", [surprise.id, bucket, path]);
        const used = (await ownerStorageUsed(surprise.owner_id)) - Number(old[0]?.size || 0);
        if (used + buf.length > limit) return fail(`Storage limit reached (${Math.round(limit / 1048576)} MB). Delete some photos or music first.`, 413);
      }
    }
    await pool.execute(
      "INSERT INTO files (surprise_id, bucket, path, mime, size, data) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE mime = VALUES(mime), size = VALUES(size), data = VALUES(data)",
      [surprise.id, bucket, path, mime, buf.length, buf]
    );
    return NextResponse.json({ data: { path }, error: null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/max_allowed_packet/i.test(msg)) return fail("Database rejected the file: raise MySQL max_allowed_packet to at least 32M.", 500);
    return fail("Could not save the file to the database.", 500);
  }
}
