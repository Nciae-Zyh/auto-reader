// Database types for D1/SQLite dual mode

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  exec(sql: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(col?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<D1Result>;
}

export interface D1ExecResult {
  results: unknown[];
  success: boolean;
}

export interface D1Result {
  results: unknown[];
  success: boolean;
  meta: {
    duration: number;
    last_row_id: number;
    changes: number;
  };
}

export interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

export interface R2Object {
  key: string;
  size: number;
  body: ReadableStream;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2PutOptions {
  httpMetadata?: {
    contentType?: string;
  };
}

export interface R2ListOptions {
  prefix?: string;
  limit?: number;
}

export interface R2Objects {
  objects: R2Object[];
}

export interface CloudflareEnv {
  DB?: D1Database;
  AUDIO_BUCKET?: R2Bucket;
}

// User type
export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

// Generation record type
export interface GenerationRecord {
  id: number;
  user_id: number;
  title: string;
  article_text: string;
  reading_mode: string;
  tts_model: string;
  status: string;
  audio_file_key: string;
  segment_count: number;
  created_at: string;
}
