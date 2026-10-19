import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db, normalizeRow, fileUrl, FILE_BUCKETS, isBucket, RowDataPacket } from "@/lib/db";
import { hasAdminAccess } from "@/lib/admin-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whitelist of tables and the columns the admin UI may touch.
const TABLES: Record<string, { cols: string[]; json?: string[]; bool?: string[]; id: boolean }> = {
  memories: { cols: ["id", "title", "story", "happened_on", "is_published", "sort_order", "created_at", "updated_at"], bool: ["is_published"], id: true },
  memory_photos: { cols: ["id", "memory_id", "storage_path", "caption", "alt_text", "sort_order", "created_at"], id: true },
  surprise_settings: { cols: ["key", "value", "updated_at"], id: false },
  stages: { cols: ["id", "type", "title", "subtitle", "button_text", "items", "options", "enabled", "sort_order"], json: ["items", "options"], bool: ["enabled"], id: true }
};
const STAGE_TYPES = ["ask", "intro", "balloons", "camera", "memories", "letters", "finale"];
const q = (c: string) => "`" + c + "`";
const fail = (message: string, status = 400) => NextResponse.json({ data: null, error: { message } }, { status });
const ok = (data: unknown) => NextResponse.json({ data, error: null });

function cleanValues(table: string, input: any) {
  const t = TABLES[table];
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (!t.cols.includes(k)) throw new Error(`Unknown column "${k}".`);
    if (k === "created_at" || k === "updated_at") continue;
    if (t.json?.includes(k)) out[k] = JSON.stringify(v ?? (k === "items" ? [] : {}));
    else if (t.bool?.includes(k)) out[k] = v ? 1 : 0;
    else out[k] = v === undefined ? null : v;
  }
  if (table === "stages" && out.type !== undefined && !STAGE_TYPES.includes(out.type)) throw new Error("Unknown stage type.");
  return out;
}

export async function POST(req: Request) {
  if (!(await hasAdminAccess())) return fail("Not signed in as admin.", 401);
  const s = await req.json().catch(() => null);
  if (!s || typeof s !== "object") return fail("Invalid request.");

  let pool;
  try { pool = await db(); } catch (e) { return fail("Server database is not available. Check DATABASE_URL.", 503); }

  try {
    /* ---------- file operations (photos + music live in the files table) ---------- */
    if (s.op === "signedUrls" || s.op === "remove") {
      const bucket: unknown = s.bucket;
      if (!isBucket(bucket)) return fail("Unknown bucket.");
      const rule = FILE_BUCKETS[bucket];
      const paths: string[] = Array.isArray(s.paths) ? s.paths : [];
      if (!paths.every(p => typeof p === "string" && rule.path.test(p))) return fail("Bad file path.");
      if (s.op === "signedUrls") {
        const map = Object.fromEntries(paths.map(p => [p, fileUrl(bucket, p)]));
        return ok(map);
      }
      if (paths.length) await pool.query("DELETE FROM files WHERE bucket = ? AND path IN (?)", [bucket, paths]);
      return ok(null);
    }

    /* ---------- table operations ---------- */
    const table = String(s.table || "");
    const t = TABLES[table];
    if (!t) return fail("Table not allowed.");

    const eq: [string, any][] = (Array.isArray(s.eq) ? s.eq : []).map((e: any) => [String(e[0]), e[1]]);
    for (const [c] of eq) if (!t.cols.includes(c)) return fail(`Unknown column "${c}".`);
    const where = eq.length ? " WHERE " + eq.map(([c]) => `${q(c)} = ?`).join(" AND ") : "";
    const whereVals = eq.map(([, v]) => v);

    const pickCols = (spec: string | undefined) => {
      if (!spec || spec.trim() === "*") return "*";
      const cols = spec.split(",").map(c => c.trim());
      if (!cols.every(c => t.cols.includes(c))) throw new Error("Unknown column in select.");
      return cols.map(q).join(", ");
    };
    const orderBy = (o: unknown) => {
      if (!o) return "";
      if (typeof o !== "string" || !t.cols.includes(o)) throw new Error("Bad order column.");
      return ` ORDER BY ${q(o)} ASC`;
    };
    const shape = (rows: any[], mode?: string) => {
      const list = rows.map(r => normalizeRow(table, r));
      if (mode === "single") {
        if (list.length !== 1) throw new Error("Expected exactly one row.");
        return list[0];
      }
      if (mode === "maybe") return list[0] ?? null;
      return list;
    };

    if (s.op === "select") {
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${pickCols(s.columns)} FROM ${q(table)}${where}${orderBy(s.order)}`, whereVals);
      return ok(shape(rows, s.single));
    }

    if (s.op === "insert" || s.op === "upsert") {
      const many = Array.isArray(s.values);
      const list: any[] = many ? s.values : [s.values];
      const ids: string[] = [];
      for (const raw of list) {
        const v = cleanValues(table, raw);
        if (t.id && !v.id) v.id = randomUUID();
        if (t.id) ids.push(v.id);
        const cols = Object.keys(v);
        if (!cols.length) return fail("Nothing to insert.");
        let sql = `INSERT INTO ${q(table)} (${cols.map(q).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
        if (s.op === "upsert") {
          const conflict = s.onConflict && t.cols.includes(s.onConflict) ? s.onConflict : t.id ? "id" : "key";
          const updates = cols.filter(c => c !== conflict);
          if (updates.length) sql += " ON DUPLICATE KEY UPDATE " + updates.map(c => `${q(c)} = VALUES(${q(c)})`).join(", ");
        }
        await pool.query(sql, cols.map(c => v[c]));
      }
      if (s.returning && t.id) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${pickCols(s.returning)} FROM ${q(table)} WHERE id IN (?)`, [ids]);
        return ok(shape(rows, many ? s.single : s.single || "single"));
      }
      return ok(null);
    }

    if (s.op === "update") {
      if (!eq.length) return fail("Update needs a filter.");
      const v = cleanValues(table, s.values);
      const cols = Object.keys(v);
      if (!cols.length) return fail("Nothing to update.");
      await pool.query(`UPDATE ${q(table)} SET ${cols.map(c => `${q(c)} = ?`).join(", ")}${where}`, [...cols.map(c => v[c]), ...whereVals]);
      if (s.returning) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${pickCols(s.returning)} FROM ${q(table)}${where}`, whereVals);
        return ok(shape(rows, s.single));
      }
      return ok(null);
    }

    if (s.op === "delete") {
      if (!eq.length) return fail("Delete needs a filter.");
      await pool.query(`DELETE FROM ${q(table)}${where}`, whereVals);
      return ok(null);
    }

    return fail("Unknown operation.");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Database error.", 400);
  }
}
