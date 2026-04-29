import type { D1Database, D1PreparedStatement, D1Result, CloudflareEnv } from "./db-types";

// Singleton for local SQLite
let localDb: D1Database | null = null;

/**
 * Get D1 database from Cloudflare environment
 */
export function getD1FromEnv(env: CloudflareEnv): D1Database | undefined {
  return env?.DB;
}

/**
 * Create a D1-compatible wrapper around better-sqlite3 for local development
 */
async function createLocalDb(): Promise<D1Database> {
  if (localDb) return localDb;

  // Dynamic import - will be tree-shaken in production
  const Database = (await import("better-sqlite3")).default;
  const sqlite = new Database(".data/local.sqlite");

  // Enable WAL mode for better concurrent access
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
 * Get database - tries Cloudflare D1 first, falls back to local SQLite
 */
export async function getDB(env?: CloudflareEnv): Promise<D1Database> {
  // Try Cloudflare D1 first
  if (env?.DB) {
    return env.DB;
  }

  // Fall back to local SQLite
  return createLocalDb();
}

/**
 * Initialize database schema
 */
export async function initDB(db: D1Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS generation_records (
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
    );

    CREATE INDEX IF NOT EXISTS idx_generation_records_user_id ON generation_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_generation_records_created_at ON generation_records(created_at);
  `);
}

// Track migration state
let migrationDone = false;

/**
 * Get database with auto-migration
 */
export async function getDBWithMigration(env?: CloudflareEnv): Promise<D1Database> {
  const db = await getDB(env);

  if (!migrationDone) {
    await initDB(db);
    migrationDone = true;
  }

  return db;
}
