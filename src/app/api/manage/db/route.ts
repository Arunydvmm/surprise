import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db, normalizeRow, fileUrl, FILE_BUCKETS, isBucket, RowDataPacket } from "@/lib/db";
import { STAGE_TYPES } from "@/lib/stages";
import { getSessionUser } from "@/lib/auth";
import { canManage, getSurpriseById } from "@/lib/surprises";
import { isSameOrigin, readJsonLimited } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whitelist of tables and the columns the editor UI may touch. surprise_id is never accepted from the client:
// every read and write is scoped to the one surprise the signed-in user is allowed to manage.
const TABLES: Record<string, { cols: string[]; json?: string[]; bool?: string[]; id: boolean }> = {
  memories: { cols: ["id", "title", "story", "happened_on", "is_published", "sort_order", "created_at", "updated_at"], bool: ["is_published"], id: true },
  memory_photos: { cols: ["id", "memory_id", "storage_path", "caption", "alt_text", "sort_order", "created_at"], id: true },
  surprise_settings: { cols: ["key", "value", "updated_at"], id: false },
  stages: { cols: ["id", "type", "title", "subtitle", "button_text", "items", "options", "enabled", "sort_order"], json: ["items", "options"], bool: ["enabled"], id: true }
};
const MAX_ROWS: Record<string, number> = { memories: 300, stages: 40 };
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
  if (table === "stages" && out.type !== undefined && !(STAGE_TYPES as readonly string[]).includes(out.type)) throw new Error("Unknown stage type.");
  return out;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in again.", 401);
  if (!isSameOrigin(req)) return fail("Cross-origin request blocked.", 403);
  let s: any;
  try { s = await readJsonLimited<any>(req, 1_000_000); }
  catch (e) { if (e instanceof Error && e.message === "REQUEST_TOO_LARGE") return fail("Request is too large.", 413); return fail("Invalid request."); }
  if (!s || typeof s !== "object" || Array.isArray(s)) return fail("Invalid request.");
  const surprise = await getSurpriseById(String(s.surprise_id || ""));
  if (!surprise || !canManage(user, surprise)) return fail("Surprise not found.", 404);
  const SID = surprise.id;

  let pool;
  try { pool = await db(); } catch (e) { console.error("[db] connection failed:", e); return fail("Database is temporarily unavailable.", 503); }

  try {
    /* ---------- file operations (photos + music live in the files table) ---------- */
    if (s.op === "signedUrls" || s.op === "remove") {
      const bucket: unknown = s.bucket;
      if (!isBucket(bucket)) return fail("Unknown bucket.");
      const rule = FILE_BUCKETS[bucket];
      const paths: string[] = Array.isArray(s.paths) ? s.paths : [];
      if (paths.length > 200) return fail("Too many file paths in one request.", 413);
      if (!paths.every(p => typeof p === "string" && rule.path.test(p))) return fail("Bad file path.");
      if (s.op === "signedUrls") {
        const map = Object.fromEntries(paths.map(p => [p, fileUrl(SID, bucket, p)]));
        return ok(map);
      }
      if (paths.length) await pool.query("DELETE FROM files WHERE surprise_id = ? AND bucket = ? AND path IN (?)", [SID, bucket, paths]);
      return ok(null);
    }

    /* ---------- table operations ---------- */
    const table = String(s.table || "");
    const t = TABLES[table];
    if (!t) return fail("Table not allowed.");

    if (Array.isArray(s.eq) && s.eq.length > 10) return fail("Too many filters.");
    const eq: [string, any][] = (Array.isArray(s.eq) ? s.eq : []).map((e: any) => {
      if (!Array.isArray(e) || e.length !== 2 || typeof e[0] !== "string") throw new Error("Invalid filter.");
      return [e[0], e[1]];
    });
    for (const [c] of eq) if (!t.cols.includes(c)) return fail(`Unknown column "${c}".`);
    const where = " WHERE `surprise_id` = ?" + eq.map(([c]) => ` AND ${q(c)} = ?`).join("");
    const whereVals = [SID, ...eq.map(([, v]) => v)];

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
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${pickCols(s.columns)} FROM ${q(table)}${where}${orderBy(s.order)} LIMIT 500`, whereVals);
      return ok(shape(rows, s.single));
    }

    if (s.op === "insert" || s.op === "upsert") {
      const many = Array.isArray(s.values);
      const list: any[] = many ? s.values : [s.values];
      if (!list.length || list.length > 100 || list.some(v => !v || typeof v !== "object" || Array.isArray(v))) return fail("Invalid or excessive record batch.", 413);
      const ids: string[] = [];
      for (const raw of list) {
        const v = cleanValues(table, raw);
        if (table === "memory_photos") {
          const [own] = await pool.query<RowDataPacket[]>("SELECT 1 FROM memories WHERE id = ? AND surprise_id = ?", [v.memory_id, SID]);
          if (!own.length) return fail("Memory not found.", 404);
        }
        if (MAX_ROWS[table] && s.op === "insert") {
          const [cnt] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${q(table)} WHERE surprise_id = ?`, [SID]);
          if (Number(cnt[0].n) >= MAX_ROWS[table]) return fail(`Limit reached (${MAX_ROWS[table]} ${table}).`, 400);
        }
        v.surprise_id = SID;
        if (t.id && !v.id) v.id = randomUUID();
        if (t.id) ids.push(v.id);
        const cols = Object.keys(v);
        if (!cols.length) return fail("Nothing to insert.");
        let sql = `INSERT INTO ${q(table)} (${cols.map(q).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
        if (s.op === "upsert") {
          const conflict = s.onConflict && t.cols.includes(s.onConflict) ? s.onConflict : t.id ? "id" : "key";
          const updates = cols.filter(c => c !== conflict && c !== "surprise_id");
          if (updates.length) sql += " ON DUPLICATE KEY UPDATE " + updates.map(c => `${q(c)} = VALUES(${q(c)})`).join(", ");
        }
        if (s.op === "upsert" && t.id) {
          const [taken] = await pool.query<RowDataPacket[]>(`SELECT surprise_id FROM ${q(table)} WHERE id = ?`, [v.id]);
          if (taken.length && taken[0].surprise_id !== SID) return fail("Record not found.", 404);
        }
        await pool.query(sql, cols.map(c => v[c]));
      }
      if (s.returning && t.id) {
        const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${pickCols(s.returning)} FROM ${q(table)} WHERE surprise_id = ? AND id IN (?)`, [SID, ids]);
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
    console.error("[manage-db] operation failed:", e);
    return fail("The database operation could not be completed. Check the submitted values and try again.", 400);
  }
}
