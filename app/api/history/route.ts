import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const db = await getDBWithMigration();
    const user = await getCurrentUser(db, cookieHeader);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Query analysis records for this user
    const { results: records } = await db.prepare(`
      SELECT ar.*, ac.article_text
      FROM analysis_records ar
      LEFT JOIN article_contents ac ON ac.analysis_id = ar.id
      WHERE ar.user_id = ?
      ORDER BY ar.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.id, limit, offset).all();

    // Get total count
    const total = await db.prepare(
      "SELECT COUNT(*) as count FROM analysis_records WHERE user_id = ?"
    ).bind(user.id).first<{ count: number }>();

    return NextResponse.json({
      records,
      total: total?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json({ error: "Failed to get history" }, { status: 500 });
  }
}
