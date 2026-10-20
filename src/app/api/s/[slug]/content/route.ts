import { NextResponse } from "next/server";
import { db, normalizeRow, fileUrl, RowDataPacket } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canView, getSurpriseBySlug } from "@/lib/surprises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the surprise page. Needs the surprise password cookie, or an owner / admin session.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const s = await getSurpriseBySlug(params.slug.toLowerCase());
  if (!s || !(await canView(await getSessionUser(), s))) return NextResponse.json({ error: "Password required." }, { status: 401 });
  try {
    const pool = await db();
    const [memRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, title, story, happened_on, sort_order FROM memories WHERE surprise_id = ? AND is_published = 1 ORDER BY sort_order, created_at", [s.id]);
    const ids = memRows.map(m => m.id);
    const [photoRows] = ids.length
      ? await pool.query<RowDataPacket[]>("SELECT id, memory_id, storage_path, caption, alt_text, sort_order FROM memory_photos WHERE surprise_id = ? AND memory_id IN (?) ORDER BY sort_order, created_at", [s.id, ids])
      : [[] as RowDataPacket[]];
    const [settingRows] = await pool.query<RowDataPacket[]>("SELECT `key`, `value` FROM surprise_settings WHERE surprise_id = ?", [s.id]);
    const [stageRows] = await pool.query<RowDataPacket[]>("SELECT * FROM stages WHERE surprise_id = ? AND enabled = 1 ORDER BY sort_order", [s.id]);

    const photoUrls: Record<string, string> = {};
    const memories = memRows.map(m => ({
      ...m,
      memory_photos: photoRows.filter(p => p.memory_id === m.id).map(p => {
        photoUrls[p.storage_path] = fileUrl(s.id, "memory-photos", p.storage_path);
        const { memory_id, ...rest } = p; return rest;
      })
    }));
    const stages = stageRows.map(r => normalizeRow("stages", r));
    const musicUrls: Record<string, string> = {};
    for (const st of stages as any[]) {
      const mp = st.options?.music_path;
      if (mp) musicUrls[mp] = fileUrl(s.id, "surprise-music", mp);
    }
    return NextResponse.json({ memories, settings: Object.fromEntries(settingRows.map(x => [x.key, x.value])), photoUrls, stages, musicUrls },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load the surprise content." }, { status: 500 });
  }
}
