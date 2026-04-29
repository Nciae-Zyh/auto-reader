import type { D1Database, User } from "./db-types";

// Session token generation
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a session for a user
 * In Cloudflare Workers, we use Response cookies
 */
export function createSessionCookies(
  userId: number,
  token: string
): string[] {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const isProd = process.env.NODE_ENV === "production";

  return [
    `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? "; Secure" : ""}`,
    `user_id=${userId}; Path=/; SameSite=Lax; Max-Age=${maxAge}${isProd ? "; Secure" : ""}`,
  ];
}

/**
 * Parse cookies from request header
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    const value = rest.join("=").trim();
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value);
    }
  });

  return cookies;
}

/**
 * Get current user from request cookies
 */
export async function getCurrentUser(
  db: D1Database,
  cookieHeader: string | null
): Promise<User | null> {
  const cookies = parseCookies(cookieHeader);
  const userId = cookies.user_id;

  if (!userId) return null;

  const user = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(parseInt(userId))
    .first<User>();

  return user || null;
}

/**
 * Exchange Google authorization code for user info
 */
export async function exchangeGoogleCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  id: string;
  email: string;
  name: string;
  picture: string;
}> {
  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error("Failed to exchange Google code");
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Get user info
  const userRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!userRes.ok) {
    throw new Error("Failed to get Google user info");
  }

  return userRes.json();
}

/**
 * Upsert user from Google info
 */
export async function upsertGoogleUser(
  db: D1Database,
  googleUser: { id: string; email: string; name: string; picture: string }
): Promise<User> {
  // Check if user exists
  const existing = await db
    .prepare("SELECT * FROM users WHERE google_id = ? OR email = ?")
    .bind(googleUser.id, googleUser.email)
    .first<User>();

  if (existing) {
    // Update existing user
    await db
      .prepare(
        "UPDATE users SET name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .bind(googleUser.name, googleUser.picture, existing.id)
      .run();

    return {
      ...existing,
      name: googleUser.name,
      avatar_url: googleUser.picture,
    };
  }

  // Create new user
  const token = generateToken();
  const result = await db
    .prepare(
      "INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)"
    )
    .bind(googleUser.id, googleUser.email, googleUser.name, googleUser.picture)
    .run();

  return {
    id: result.meta.last_row_id,
    google_id: googleUser.id,
    email: googleUser.email,
    name: googleUser.name,
    avatar_url: googleUser.picture,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Save generation record
 */
export async function saveGenerationRecord(
  db: D1Database,
  userId: number,
  data: {
    title: string;
    articleText: string;
    readingMode: string;
    ttsModel: string;
    status: string;
    audioFileKey: string;
    segmentCount: number;
  }
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO generation_records
       (user_id, title, article_text, reading_mode, tts_model, status, audio_file_key, segment_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      userId,
      data.title,
      data.articleText,
      data.readingMode,
      data.ttsModel,
      data.status,
      data.audioFileKey,
      data.segmentCount
    )
    .run();

  return result.meta.last_row_id;
}

/**
 * Get user's generation history
 */
export async function getUserHistory(
  db: D1Database,
  userId: number,
  limit = 50,
  offset = 0
): Promise<{ records: Array<Record<string, unknown>>; total: number }> {
  const { results: records } = await db
    .prepare(
      "SELECT * FROM generation_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .bind(userId, limit, offset)
    .all();

  const total = await db
    .prepare("SELECT COUNT(*) as count FROM generation_records WHERE user_id = ?")
    .bind(userId)
    .first<{ count: number }>();

  return {
    records,
    total: total?.count || 0,
  };
}

/**
 * Update generation record status
 */
export async function updateGenerationRecord(
  db: D1Database,
  recordId: number,
  data: {
    status?: string;
    audioFileKey?: string;
    title?: string;
  }
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.status !== undefined) {
    updates.push("status = ?");
    values.push(data.status);
  }
  if (data.audioFileKey !== undefined) {
    updates.push("audio_file_key = ?");
    values.push(data.audioFileKey);
  }
  if (data.title !== undefined) {
    updates.push("title = ?");
    values.push(data.title);
  }

  if (updates.length === 0) return;

  values.push(recordId);
  await db
    .prepare(`UPDATE generation_records SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}
