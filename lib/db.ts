import type { D1Database, D1PreparedStatement, D1Result, CloudflareEnv } from "./db-types";

// Singleton for local SQLite (only used in development)
let localDb: D1Database | null = null;

/**
 * Create a D1-compatible wrapper around better-sqlite3 for LOCAL development only
 */
async function createLocalDb(): Promise<D1Database> {
  if (localDb) return localDb;

  if (typeof globalThis.navigator !== "undefined") {
    throw new Error("Local SQLite not available in browser environment");
  }

  const Database = (await import("better-sqlite3")).default;
  const sqlite = new Database(".data/local.sqlite");
  sqlite.pragma("journal_mode = WAL");

  const makeStmt = (sql: string, params: unknown[] = []): D1PreparedStatement => ({
    bind: (...p: unknown[]) => makeStmt(sql, p),
    async first<T = Record<string, unknown>>(col?: string): Promise<T | null> {
      const stmt = sqlite.prepare(sql);
      const row = stmt.get(...params) as Record<string, unknown> | undefined;
      if (!row) return null;
      if (col) return (row[col] as T) ?? null;
      return row as T;
    },
    async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
      const stmt = sqlite.prepare(sql);
      const rows = stmt.all(...params) as T[];
      return { results: rows };
    },
    async run(): Promise<D1Result> {
      const stmt = sqlite.prepare(sql);
      const result = stmt.run(...params);
      return {
        results: [],
        success: true,
        meta: { duration: 0, last_row_id: Number(result.lastInsertRowid), changes: result.changes },
      };
    },
  });

  localDb = {
    prepare: (sql: string) => makeStmt(sql),
    exec: async (sql: string) => { sqlite.exec(sql); return { results: [], success: true }; },
  };

  return localDb;
}

/**
 * Get database - Cloudflare D1 in production, local SQLite in development
 */
export async function getDB(): Promise<D1Database> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const d1 = (env as Record<string, unknown>)?.DB as D1Database | undefined;
    if (d1) return d1;
  } catch {}

  if (process.env.NODE_ENV === "development" || !globalThis.caches) {
    return createLocalDb();
  }

  throw new Error("Database not available. Please configure D1 binding in wrangler.jsonc");
}

/**
 * Initialize database schema
 */
export async function initDB(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS analysis_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      article_text TEXT NOT NULL,
      narrator_voice TEXT DEFAULT '',
      reading_mode TEXT NOT NULL DEFAULT 'ai',
      tts_model TEXT NOT NULL DEFAULT 'mimo-v2.5-tts-voicedesign',
      status TEXT NOT NULL DEFAULT 'pending',
      merged_audio_key TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS audio_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL,
      segment_index INTEGER NOT NULL,
      character_name TEXT NOT NULL DEFAULT '',
      character_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'narration',
      text TEXT NOT NULL,
      voice_description TEXT DEFAULT '',
      style_instruction TEXT DEFAULT '',
      audio_file_key TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_id) REFERENCES analysis_records(id) ON DELETE CASCADE
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS usage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      user_id INTEGER,
      action TEXT NOT NULL,
      ip_address TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_analysis_records_user_id ON analysis_records(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_analysis_records_created_at ON analysis_records(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_audio_segments_analysis_id ON audio_segments(analysis_id)",
    "CREATE INDEX IF NOT EXISTS idx_usage_records_identifier ON usage_records(identifier)",
  ];

  for (const sql of indexes) {
    await db.prepare(sql).run().catch((e: unknown) => {
      console.warn("[initDB] Index skipped:", (e as Error)?.message);
    });
  }
}

const _migrationDone = new Set<string>();

export async function getDBWithMigration(): Promise<D1Database> {
  const db = await getDB();

  if (!_migrationDone.has("default")) {
    try {
      await initDB(db);
      _migrationDone.add("default");
    } catch (error: unknown) {
      console.warn("[getDBWithMigration] DB init failed:", (error as Error)?.message);
    }
  }

  return db;
}
