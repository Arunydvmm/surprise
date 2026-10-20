import mysql, { Pool, PoolConnection, PoolOptions, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { randomUUID } from "crypto";
import { defaultOccasions, defaultPlatformSettings, defaultThemes } from "@/lib/seed";
import { hashPassword } from "@/lib/password";

/* ------------------------------------------------------------------ */
/* Connection                                                          */
/* ------------------------------------------------------------------ */

function sslOptions(): PoolOptions["ssl"] | undefined {
  const flag = (process.env.DB_SSL || "").toLowerCase();
  if (!["1", "true", "yes", "required"].includes(flag)) return undefined;
  const ca = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");
  return {
    minVersion: "TLSv1.2",
    ca: ca || undefined,
    rejectUnauthorized: (process.env.DB_SSL_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false"
  };
}

function poolConfig(): PoolOptions {
  let host = process.env.DB_HOST, port = Number(process.env.DB_PORT || 3306);
  let user = process.env.DB_USER, password = process.env.DB_PASSWORD, database = process.env.DB_NAME;
  // DATABASE_URL is preferred; Railway's own MySQL variables work as fallbacks.
  const raw = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (!raw && !host && process.env.MYSQLHOST) {
    host = process.env.MYSQLHOST; port = Number(process.env.MYSQLPORT || 3306);
    user = process.env.MYSQLUSER; password = process.env.MYSQLPASSWORD; database = process.env.MYSQLDATABASE;
  }
  if (raw) {
    const u = new URL(raw);
    host = u.hostname; port = Number(u.port || 3306);
    user = decodeURIComponent(u.username); password = decodeURIComponent(u.password);
    database = decodeURIComponent(u.pathname.replace(/^\//, ""));
  }
  if (!host || !user || !database) {
    throw new Error("Database is not configured. Set DATABASE_URL (mysql://user:pass@host:3306/dbname).");
  }
  return {
    host, port, user, password, database,
    ssl: sslOptions(),
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: Math.min(20, Math.max(1, Number.isFinite(Number(process.env.DB_POOL_SIZE)) ? Math.floor(Number(process.env.DB_POOL_SIZE || 5)) : 5)),
    dateStrings: true, // DATE/DATETIME come back as plain strings ("2026-10-19")
    connectTimeout: 15000
  };
}

type G = typeof globalThis & { __s4uPool?: Pool; __s4uReady?: Promise<void> };
const g = globalThis as G;

const CS = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

/**
 * Every table is created with IF NOT EXISTS. The five "content" tables are created in their ORIGINAL
 * shape (no surprise_id) so that an existing Bestie Surprise database and a brand-new one follow the
 * same upgrade path below.
 */
const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS memories (
     id CHAR(36) NOT NULL PRIMARY KEY, title VARCHAR(500) NOT NULL, story TEXT NULL, happened_on DATE NULL,
     is_published TINYINT(1) NOT NULL DEFAULT 0, sort_order INT NOT NULL DEFAULT 0,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS memory_photos (
     id CHAR(36) NOT NULL PRIMARY KEY, memory_id CHAR(36) NOT NULL, storage_path VARCHAR(255) NOT NULL,
     caption VARCHAR(1000) NULL, alt_text VARCHAR(1000) NULL, sort_order INT NOT NULL DEFAULT 0,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uq_memory_photos_path (storage_path), KEY idx_memory_photos_memory (memory_id, sort_order),
     CONSTRAINT fk_memory_photos_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS surprise_settings (
     \`key\` VARCHAR(100) NOT NULL PRIMARY KEY, \`value\` TEXT NOT NULL,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS stages (
     id CHAR(36) NOT NULL PRIMARY KEY, type VARCHAR(20) NOT NULL, title VARCHAR(500) NOT NULL DEFAULT '',
     subtitle VARCHAR(1000) NOT NULL DEFAULT '', button_text VARCHAR(200) NOT NULL DEFAULT 'Continue',
     items JSON NOT NULL, options JSON NOT NULL, enabled TINYINT(1) NOT NULL DEFAULT 1, sort_order INT NOT NULL DEFAULT 0
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS files (
     bucket VARCHAR(40) NOT NULL, path VARCHAR(255) NOT NULL, mime VARCHAR(100) NOT NULL, size INT NOT NULL,
     data LONGBLOB NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (bucket, path)
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS users (
     id CHAR(36) NOT NULL PRIMARY KEY, google_sub VARCHAR(64) NOT NULL, email VARCHAR(255) NOT NULL,
     name VARCHAR(255) NULL, avatar_url VARCHAR(1000) NULL, role VARCHAR(10) NOT NULL DEFAULT 'user',
     is_blocked TINYINT(1) NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, last_login_at TIMESTAMP NULL,
     UNIQUE KEY uq_users_sub (google_sub), UNIQUE KEY uq_users_email (email)
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash CHAR(64) NOT NULL PRIMARY KEY, user_id CHAR(36) NOT NULL, expires_at BIGINT NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY idx_sessions_user (user_id)
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
     k VARCHAR(190) NOT NULL PRIMARY KEY, hits INT NOT NULL, reset_at BIGINT NOT NULL
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS themes (
     id VARCHAR(40) NOT NULL PRIMARY KEY, name VARCHAR(100) NOT NULL, emoji VARCHAR(16) NOT NULL DEFAULT '🎁',
     roseink VARCHAR(9) NOT NULL, berry VARCHAR(9) NOT NULL, petal VARCHAR(9) NOT NULL, blush VARCHAR(9) NOT NULL,
     cream VARCHAR(9) NOT NULL, bg VARCHAR(9) NOT NULL, font VARCHAR(300) NOT NULL,
     enabled TINYINT(1) NOT NULL DEFAULT 1, sort_order INT NOT NULL DEFAULT 0
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS occasions (
     id CHAR(36) NOT NULL PRIMARY KEY, slug VARCHAR(60) NOT NULL, name VARCHAR(100) NOT NULL, emoji VARCHAR(16) NOT NULL DEFAULT '🎁',
     description VARCHAR(300) NOT NULL DEFAULT '', theme_id VARCHAR(40) NULL, defaults JSON NOT NULL, effects JSON NOT NULL, stages JSON NOT NULL,
     enabled TINYINT(1) NOT NULL DEFAULT 1, sort_order INT NOT NULL DEFAULT 0, UNIQUE KEY uq_occasions_slug (slug)
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS platform_settings (
     \`key\` VARCHAR(100) NOT NULL PRIMARY KEY, \`value\` MEDIUMTEXT NOT NULL,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ${CS}`,
  `CREATE TABLE IF NOT EXISTS surprises (
     id CHAR(36) NOT NULL PRIMARY KEY, owner_id CHAR(36) NULL, slug VARCHAR(60) NOT NULL, title VARCHAR(200) NOT NULL,
     occasion_id CHAR(36) NULL, password_hash VARCHAR(255) NULL, password_version INT NOT NULL DEFAULT 1,
     is_published TINYINT(1) NOT NULL DEFAULT 0, is_legacy TINYINT(1) NOT NULL DEFAULT 0,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     UNIQUE KEY uq_surprises_slug (slug), KEY idx_surprises_owner (owner_id)
   ) ${CS}`
];

const CONTENT_TABLES = ["memories", "memory_photos", "surprise_settings", "stages", "files"] as const;

async function scalar(c: PoolConnection, sql: string, params: unknown[] = []): Promise<number> {
  const [rows] = await c.query<RowDataPacket[]>(sql, params);
  return Number(rows[0] ? Object.values(rows[0])[0] : 0);
}
const hasColumn = (c: PoolConnection, t: string, col: string) =>
  scalar(c, "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?", [t, col]).then(n => n > 0);
const columnNullable = (c: PoolConnection, t: string, col: string) =>
  scalar(c, "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND IS_NULLABLE = 'YES'", [t, col]).then(n => n > 0);
const hasIndex = (c: PoolConnection, t: string, name: string) =>
  scalar(c, "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?", [t, name]).then(n => n > 0);
async function primaryKey(c: PoolConnection, t: string): Promise<string[]> {
  const [rows] = await c.query<RowDataPacket[]>("SELECT COLUMN_NAME AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = 'PRIMARY' ORDER BY SEQ_IN_INDEX", [t]);
  return rows.map(r => r.c);
}

/**
 * One-time, repeatable upgrade. It never deletes content:
 *  1. adds surprise_id to the five content tables
 *  2. if old single-surprise data exists, wraps it in a "legacy" surprise (slug "bestie", password = old SITE_PASSWORD)
 *  3. tightens keys, then seeds themes / occasions / platform settings into EMPTY tables only
 */
async function migrate(pool: Pool) {
  const c = await pool.getConnection();
  try {
    await c.query("SELECT GET_LOCK('surprise4u_migrate', 120)");
    for (const sql of SCHEMA) await c.query(sql);

    for (const t of CONTENT_TABLES) {
      if (!(await hasColumn(c, t, "surprise_id"))) await c.query(`ALTER TABLE \`${t}\` ADD COLUMN surprise_id CHAR(36) NULL`);
    }

    let orphans = 0;
    for (const t of CONTENT_TABLES) orphans += await scalar(c, `SELECT COUNT(*) FROM \`${t}\` WHERE surprise_id IS NULL`);
    if (orphans > 0) {
      let legacyId = "";
      const [ex] = await c.query<RowDataPacket[]>("SELECT id FROM surprises WHERE is_legacy = 1 LIMIT 1");
      if (ex[0]) legacyId = ex[0].id;
      else {
        legacyId = randomUUID();
        const [slugRows] = await c.query<RowDataPacket[]>("SELECT 1 FROM surprises WHERE slug = 'bestie'");
        const slug = slugRows.length ? "bestie-" + randomUUID().slice(0, 4) : "bestie";
        const hash = process.env.SITE_PASSWORD ? await hashPassword(process.env.SITE_PASSWORD) : null;
        await c.query(
          "INSERT INTO surprises (id, owner_id, slug, title, occasion_id, password_hash, password_version, is_published, is_legacy) VALUES (?, NULL, ?, 'Bestie Surprise', NULL, ?, 1, 1, 1)",
          [legacyId, slug, hash]);
      }
      for (const t of CONTENT_TABLES) await c.query(`UPDATE \`${t}\` SET surprise_id = ? WHERE surprise_id IS NULL`, [legacyId]);
    }

    for (const t of CONTENT_TABLES) {
      if (await columnNullable(c, t, "surprise_id")) await c.query(`ALTER TABLE \`${t}\` MODIFY surprise_id CHAR(36) NOT NULL`);
    }
    if ((await primaryKey(c, "surprise_settings")).join() === "key") await c.query("ALTER TABLE surprise_settings DROP PRIMARY KEY, ADD PRIMARY KEY (surprise_id, `key`)");
    if ((await primaryKey(c, "files")).join() === "bucket,path") await c.query("ALTER TABLE files DROP PRIMARY KEY, ADD PRIMARY KEY (surprise_id, bucket, path)");
    if (!(await hasIndex(c, "memories", "idx_memories_surprise"))) await c.query("CREATE INDEX idx_memories_surprise ON memories (surprise_id, sort_order)");
    if (!(await hasIndex(c, "memory_photos", "idx_photos_surprise"))) await c.query("CREATE INDEX idx_photos_surprise ON memory_photos (surprise_id)");
    if (!(await hasIndex(c, "stages", "idx_stages_surprise"))) await c.query("CREATE INDEX idx_stages_surprise ON stages (surprise_id, sort_order)");

    if ((await scalar(c, "SELECT COUNT(*) FROM themes")) === 0) {
      let i = 0;
      for (const t of defaultThemes) await c.query("INSERT INTO themes (id, name, emoji, roseink, berry, petal, blush, cream, bg, font, enabled, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)",
        [t.id, t.name, t.emoji, t.roseink, t.berry, t.petal, t.blush, t.cream, t.bg, t.font, i++]);
    }
    if ((await scalar(c, "SELECT COUNT(*) FROM occasions")) === 0) {
      let i = 0;
      for (const o of defaultOccasions) await c.query("INSERT INTO occasions (id, slug, name, emoji, description, theme_id, defaults, effects, stages, enabled, sort_order) VALUES (?,?,?,?,?,?,?,?,?,1,?)",
        [randomUUID(), o.slug, o.name, o.emoji, o.description, o.theme_id, JSON.stringify(o.defaults), JSON.stringify(o.effects), JSON.stringify(o.stages), i++]);
    }
    for (const [k, v] of Object.entries(defaultPlatformSettings)) await c.query("INSERT IGNORE INTO platform_settings (`key`, `value`) VALUES (?, ?)", [k, v]);
  } finally {
    try { await c.query("SELECT RELEASE_LOCK('surprise4u_migrate')"); } catch {}
    c.release();
  }
}

/** Returns a shared pool. Creates / upgrades tables on first use. */
export async function db(): Promise<Pool> {
  if (!g.__s4uPool) g.__s4uPool = mysql.createPool(poolConfig());
  if (!g.__s4uReady) {
    const pool = g.__s4uPool;
    g.__s4uReady = migrate(pool).catch(err => { g.__s4uReady = undefined; throw err; });
  }
  await g.__s4uReady;
  return g.__s4uPool;
}

export const isDbConfigured = () => !!(process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQLHOST || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME));

/* ------------------------------------------------------------------ */
/* Row helpers                                                         */
/* ------------------------------------------------------------------ */

export const parseJson = (v: unknown, fallback: unknown) => {
  if (v == null) return fallback;
  if (typeof v !== "string") return v; // mysql2 already parsed it
  try { return JSON.parse(v); } catch { return fallback; }
};

/** Converts MySQL rows into the shape the UI expects (booleans, parsed JSON). */
export function normalizeRow(table: string, row: Record<string, any>) {
  const r = { ...row };
  if ("is_published" in r) r.is_published = !!r.is_published;
  if ("enabled" in r) r.enabled = !!r.enabled;
  if (table === "stages") {
    if ("items" in r) r.items = parseJson(r.items, []);
    if ("options" in r) r.options = parseJson(r.options, {});
  }
  return r;
}

export type { RowDataPacket, ResultSetHeader, Pool, PoolConnection };

export const FILE_BUCKETS = {
  "memory-photos": { maxBytes: 8 * 1024 * 1024, mime: /^image\/(jpeg|png|webp|gif)$/, path: /^[0-9a-fA-F-]{36}\/[A-Za-z0-9._-]{1,200}$/ },
  "surprise-music": { maxBytes: 15 * 1024 * 1024, mime: /^audio\/(mpeg|mp4|x-m4a|m4a|aac|wav|x-wav|ogg|webm)$/, path: /^music\/[A-Za-z0-9._-]{1,200}$/ }
} as const;
export type BucketName = keyof typeof FILE_BUCKETS;
export const isBucket = (b: unknown): b is BucketName => typeof b === "string" && b in FILE_BUCKETS;
export const fileUrl = (surpriseId: string, bucket: string, path: string) =>
  `/api/files?s=${encodeURIComponent(surpriseId)}&b=${encodeURIComponent(bucket)}&p=${encodeURIComponent(path)}`;
