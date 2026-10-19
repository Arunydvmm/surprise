import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { randomUUID } from "crypto";
import { defaultSettings, seedStages } from "@/lib/seed";

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

type G = typeof globalThis & { __bestiePool?: Pool; __bestieReady?: Promise<void> };
const g = globalThis as G;

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS memories (
     id CHAR(36) NOT NULL PRIMARY KEY,
     title VARCHAR(500) NOT NULL,
     story TEXT NULL,
     happened_on DATE NULL,
     is_published TINYINT(1) NOT NULL DEFAULT 0,
     sort_order INT NOT NULL DEFAULT 0,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS memory_photos (
     id CHAR(36) NOT NULL PRIMARY KEY,
     memory_id CHAR(36) NOT NULL,
     storage_path VARCHAR(255) NOT NULL,
     caption VARCHAR(1000) NULL,
     alt_text VARCHAR(1000) NULL,
     sort_order INT NOT NULL DEFAULT 0,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uq_memory_photos_path (storage_path),
     KEY idx_memory_photos_memory (memory_id, sort_order),
     CONSTRAINT fk_memory_photos_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS surprise_settings (
     \`key\` VARCHAR(100) NOT NULL PRIMARY KEY,
     \`value\` TEXT NOT NULL,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS stages (
     id CHAR(36) NOT NULL PRIMARY KEY,
     type VARCHAR(20) NOT NULL,
     title VARCHAR(500) NOT NULL DEFAULT '',
     subtitle VARCHAR(1000) NOT NULL DEFAULT '',
     button_text VARCHAR(200) NOT NULL DEFAULT 'Continue',
     items JSON NOT NULL,
     options JSON NOT NULL,
     enabled TINYINT(1) NOT NULL DEFAULT 1,
     sort_order INT NOT NULL DEFAULT 0,
     KEY idx_stages_order (sort_order)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  // Uploaded photos and music live here (LONGBLOB), keyed by bucket + path.
  `CREATE TABLE IF NOT EXISTS files (
     bucket VARCHAR(40) NOT NULL,
     path VARCHAR(255) NOT NULL,
     mime VARCHAR(100) NOT NULL,
     size INT NOT NULL,
     data LONGBLOB NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (bucket, path)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

async function migrate(pool: Pool) {
  for (const sql of SCHEMA) await pool.query(sql);
  for (const [key, value] of Object.entries(defaultSettings)) {
    await pool.query("INSERT IGNORE INTO surprise_settings (`key`, `value`) VALUES (?, ?)", [key, value]);
  }
  const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM stages");
  if (Number(rows[0].n) === 0) {
    for (const s of seedStages) {
      await pool.query(
        "INSERT INTO stages (id, type, title, subtitle, button_text, items, options, enabled, sort_order) VALUES (?,?,?,?,?,?,?,1,?)",
        [randomUUID(), s.type, s.title, s.subtitle, s.button_text, JSON.stringify(s.items), JSON.stringify(s.options || {}), s.sort_order]
      );
    }
  }
}

/** Returns a shared pool. Creates tables + seed content on first use. */
export async function db(): Promise<Pool> {
  if (!g.__bestiePool) g.__bestiePool = mysql.createPool(poolConfig());
  if (!g.__bestieReady) {
    const pool = g.__bestiePool;
    g.__bestieReady = migrate(pool).catch(err => { g.__bestieReady = undefined; throw err; });
  }
  await g.__bestieReady;
  return g.__bestiePool;
}

export const isDbConfigured = () => !!(process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQLHOST || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME));

/* ------------------------------------------------------------------ */
/* Row helpers                                                         */
/* ------------------------------------------------------------------ */

const parseJson = (v: unknown, fallback: unknown) => {
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

export type { RowDataPacket, ResultSetHeader };

export const FILE_BUCKETS = {
  "memory-photos": { maxBytes: 8 * 1024 * 1024, mime: /^image\/(jpeg|png|webp|gif)$/, path: /^[0-9a-fA-F-]{36}\/[A-Za-z0-9._-]{1,200}$/ },
  "surprise-music": { maxBytes: 15 * 1024 * 1024, mime: /^audio\/(mpeg|mp4|x-m4a|m4a|aac|wav|x-wav|ogg|webm)$/, path: /^music\/[A-Za-z0-9._-]{1,200}$/ }
} as const;
export type BucketName = keyof typeof FILE_BUCKETS;
export const isBucket = (b: unknown): b is BucketName => typeof b === "string" && b in FILE_BUCKETS;
export const fileUrl = (bucket: string, path: string) => `/api/files?b=${encodeURIComponent(bucket)}&p=${encodeURIComponent(path)}`;
