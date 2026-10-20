import { NextResponse } from "next/server";
import { db, normalizeRow, fileUrl, RowDataPacket } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the surprise page. The middleware already requires the password cookie for /api/*.
export async function GET() {
  try {
    const pool = await db();
    const [memRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, title, story, happened_on, sort_order FROM memories WHERE is_published = 1 ORDER BY sort_order, created_at");
    const ids = memRows.map(m => m.id);
    const [photoRows] = ids.length
      ? await pool.query<RowDataPacket[]>("SELECT id, memory_id, storage_path, caption, alt_text, sort_order FROM memory_photos WHERE memory_id IN (?) ORDER BY sort_order, created_at", [ids])
      : [[] as RowDataPacket[]];
    const [settingRows] = await pool.query<RowDataPacket[]>("SELECT `key`, `value` FROM surprise_settings");
    const [stageRows] = await pool.query<RowDataPacket[]>("SELECT * FROM stages WHERE enabled = 1 ORDER BY sort_order");

    const photoUrls: Record<string, string> = {};
    const memories = memRows.map(m => ({
      ...m,
      memory_photos: photoRows.filter(p => p.memory_id === m.id).map(p => {
        photoUrls[p.storage_path] = fileUrl("memory-photos", p.storage_path);
        const { memory_id, ...rest } = p; return rest;
      })
    }));

    const stages = stageRows.map(r => normalizeRow("stages", r));
    const musicUrls: Record<string, string> = {};
    for (const s of stages as any[]) {
      const mp = s.options?.music_path;
      if (mp) musicUrls[mp] = fileUrl("surprise-music", mp);
    }

    return NextResponse.json({
      memories,
      settings: Object.fromEntries(settingRows.map(x => [x.key, x.value])),
      photoUrls, stages, musicUrls
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load the surprise content." }, { status: 500 });
  }
}
