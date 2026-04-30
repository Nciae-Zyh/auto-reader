import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const db = await getDBWithMigration();
    const cookieHeader = request.headers.get("cookie");
    const user = await getCurrentUser(db, cookieHeader);
    const ip = getClientIp(request);
    const identifier = user ? `user:${user.id}` : `ip:${ip}`;

    const rateLimit = await checkRateLimit(db, identifier, !!user);

    return NextResponse.json({
      isLoggedIn: !!user,
      rateLimit: {
        limit: rateLimit.remaining === -1 ? -1 : 5,
        used: rateLimit.used,
        remaining: rateLimit.remaining,
        unlimited: rateLimit.remaining === -1,
      },
    });
  } catch (error) {
    console.error("Rate limit check error:", error);
    return NextResponse.json(
      { error: "Failed to check rate limit" },
      { status: 500 }
    );
  }
}
