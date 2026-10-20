import { NextResponse } from "next/server";
import { db, FILE_BUCKETS, isBucket } from "@/lib/db";
import { hasAdminAccess } from "@/lib/admin-gate";
import { hasAllowedFileSignature, isSameOrigin, readBytesLimited } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (message: string, status = 400) => NextResponse.json({ data: null, error: { message } }, { status });

export async function POST(req: Request) {
  if (!(await hasAdminAccess())) return fail("Not signed in as admin.", 401);
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
