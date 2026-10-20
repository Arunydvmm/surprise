import { NextResponse } from "next/server";
import { db, FILE_BUCKETS, isBucket, RowDataPacket } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canView, getSurpriseById } from "@/lib/surprises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serves photos/music stored in MySQL, only to people who may view that surprise.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sid = url.searchParams.get("s") || "", bucket = url.searchParams.get("b") || "", path = url.searchParams.get("p") || "";
  const surprise = await getSurpriseById(sid);
  if (!surprise || !(await canView(await getSessionUser(), surprise))) return NextResponse.json({ error: "Password required." }, { status: 401 });
  if (!isBucket(bucket) || !FILE_BUCKETS[bucket].path.test(path)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let row: RowDataPacket | undefined;
  try {
    const pool = await db();
    const [rows] = await pool.query<RowDataPacket[]>("SELECT mime, data FROM files WHERE surprise_id = ? AND bucket = ? AND path = ?", [surprise.id, bucket, path]);
    row = rows[0];
  } catch { return NextResponse.json({ error: "Database unavailable." }, { status: 503 }); }
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const data = row.data as Buffer, total = data.length;
  const headers: Record<string, string> = {
    "Content-Type": row.mime, "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=86400" // paths are unique per upload, so caching is safe
  };

  // Range support so audio can seek (Safari requires it for <audio>).
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    let start = range[1] ? parseInt(range[1], 10) : total - parseInt(range[2], 10);
    let end = range[1] && range[2] ? parseInt(range[2], 10) : total - 1;
    start = Math.max(0, start); end = Math.min(end, total - 1);
    if (start > end || start >= total) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    const part = data.subarray(start, end + 1);
    return new NextResponse(part as unknown as BodyInit, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(part.length) } });
  }
  return new NextResponse(data as unknown as BodyInit, { status: 200, headers: { ...headers, "Content-Length": String(total) } });
}
