import type { D1Database, D1PreparedStatement, D1Result, CloudflareEnv } from "./db-types";

// Singleton for local SQLite (only used in development)
let localDb: D1Database | null = null;

/**
 * Create a D1-compatible wrapper around better-sqlite3 for LOCAL development only
 */
async function createLocalDb(): Promise<D1Database> {
  if (localDb) return localDb;

  // Only import better-sqlite3 in Node.js environment (development)
  if (typeof globalThis.navigator !== "undefined") {
    throw new Error("Local SQLite not available in browser environment");
  }

  const Database = (await import("better-sqlite3")).default;
  const sqlite = new Database(".data/local.sqlite");

  // Enable WAL mode
  sqlite.pragma("journal_mode = WAL");

  const makeStmt = (
    sql: string,
    params: unknown[] = []
  ): D1PreparedStatement => ({
    bind: (...p: unknown[]) => makeStmt(sql, p),
    async first<T = Record<string, unknown>>(
      col?: string
    ): Promise<T | null> {
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
        meta: {
          duration: 0,
          last_row_id: Number(result.lastInsertRowid),
          changes: result.changes,
        },
      };
    },
  });

  localDb = {
    prepare: (sql: string) => makeStmt(sql),
    exec: async (sql: string) => {
      sqlite.exec(sql);
      return { results: [], success: true };
    },
  };

  return localDb;
}

/**
 * Get database - Cloudflare D1 in production, local SQLite in development
 */
export async function getDB(): Promise<D1Database> {
  // Try Cloudflare D1 via OpenNext context
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const d1 = (env as Record<string, unknown>)?.DB as D1Database | undefined;
    if (d1) {
      return d1;
    }
  } catch {
    // Not in Cloudflare environment
  }

  // Only use local SQLite in development (not in Cloudflare Workers)
  if (process.env.NODE_ENV === "development" || !globalThis.caches) {
    return createLocalDb();
  }

  throw new Error("Database not available. Please configure D1 binding in wrangler.jsonc");
}

/**
 * Initialize database schema
 * D1 doesn't support multiple statements in exec(), so we execute one by one
 */
export async function initDB(db: D1Database): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS generation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      article_text TEXT NOT NULL,
      reading_mode TEXT NOT NULL DEFAULT 'ai',
      tts_model TEXT NOT NULL DEFAULT 'mimo-v2.5-tts-voicedesign',
      status TEXT NOT NULL DEFAULT 'pending',
      audio_file_key TEXT DEFAULT '',
      segment_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_generation_records_user_id ON generation_records(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_generation_records_created_at ON generation_records(created_at)`,
    `CREATE TABLE IF NOT EXISTS usage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      user_id INTEGER,
      action TEXT NOT NULL,
      ip_address TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_usage_records_identifier ON usage_records(identifier)`,
    `CREATE INDEX IF NOT EXISTS idx_usage_records_created_at ON usage_records(created_at)`,
  ];

  for (const sql of statements) {
    await db.exec(sql);
  }
}

// Track migration state
let migrationDone = false;

/**
 * Get database with auto-migration
 */
export async function getDBWithMigration(): Promise<D1Database> {
  const db = await getDB();

  if (!migrationDone) {
    await initDB(db);
    migrationDone = true;
  }

  return db;
}
