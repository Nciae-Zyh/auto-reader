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
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const search = url.searchParams.get("search") || "";

    let query = "SELECT ar.* FROM analysis_records ar WHERE ar.user_id = ?";
    let countQuery = "SELECT COUNT(*) as count FROM analysis_records WHERE user_id = ?";
    const params: unknown[] = [user.id];
    const countParams: unknown[] = [user.id];

    if (search) {
      query += " AND (ar.title LIKE ? OR ar.summary LIKE ?)";
      countQuery += " AND (ar.title LIKE ? OR ar.summary LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm);
    }

    query += " ORDER BY ar.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const { results: records } = await db.prepare(query).bind(...params).all();
    const total = await db.prepare(countQuery).bind(...countParams).first<{ count: number }>();

    return NextResponse.json({
      records,
      total: total?.count || 0,
      limit,
      offset,
      hasMore: offset + limit < (total?.count || 0),
    });
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json({ error: "Failed to get history" }, { status: 500 });
  }
}
