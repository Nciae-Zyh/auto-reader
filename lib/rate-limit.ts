import type { D1Database } from "./db-types";

const DAILY_LIMIT = 5;

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

/**
 * Check if user has exceeded daily rate limit
 * Returns { allowed: boolean, remaining: number, used: number }
 */
export async function checkRateLimit(
  db: D1Database,
  identifier: string,
  is_logged_in: boolean
): Promise<{ allowed: boolean; remaining: number; used: number }> {
  // Logged in users have no limit
  if (is_logged_in) {
    return { allowed: true, remaining: -1, used: 0 };
  }

  // Get today's date (UTC)
  const today = new Date().toISOString().split("T")[0];

  // Count usage today
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count FROM usage_records
       WHERE identifier = ? AND DATE(created_at) = ?`
    )
    .bind(identifier, today)
    .first<{ count: number }>();

  const used = result?.count || 0;
  const remaining = Math.max(0, DAILY_LIMIT - used);

  return {
    allowed: used < DAILY_LIMIT,
    remaining,
    used,
  };
}

/**
 * Record usage
 */
export async function recordUsage(
  db: D1Database,
  identifier: string,
  userId: number | null,
  action: string,
  ip: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO usage_records (identifier, user_id, action, ip_address, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
    .bind(identifier, userId, action, ip)
    .run();
}
