import { NextRequest, NextResponse } from "next/server";
import { analyzeArticle } from "@/lib/analyzer";
import { getServerConfig, isServerMode } from "@/lib/config";
import { getDBWithMigration } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, recordUsage, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { article, baseUrl } = await request.json();
    const serverConfig = getServerConfig();
    const apiKey = serverConfig.apiKey;
    const finalBaseUrl = serverConfig.baseUrl || baseUrl;

    if (!article || !apiKey) {
      return NextResponse.json(
        { error: "文章内容和 API Key 为必填项" },
        { status: 400 }
      );
    }

    const serverMode = isServerMode();
    let rateLimitInfo = null;

    // Rate limiting only in server mode
    if (serverMode) {
      const db = await getDBWithMigration();
      const cookieHeader = request.headers.get("cookie");
      const user = await getCurrentUser(db, cookieHeader);
      const ip = getClientIp(request);
      const identifier = user ? `user:${user.id}` : `ip:${ip}`;

      const rateLimit = await checkRateLimit(db, identifier, !!user);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: "今日使用次数已用完，请登录后继续使用",
            rateLimit: {
              used: rateLimit.used,
              remaining: rateLimit.remaining,
              limit: 5,
            },
          },
          { status: 429 }
        );
      }

      await recordUsage(db, identifier, user?.id || null, "analyze", ip);

      rateLimitInfo = {
        used: rateLimit.used + 1,
        remaining: rateLimit.remaining - 1,
        limit: 5,
      };
    }

    const result = await analyzeArticle(article, apiKey, finalBaseUrl);
    return NextResponse.json({
      ...result,
      ...(rateLimitInfo && { rateLimit: rateLimitInfo }),
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分析失败" },
      { status: 500 }
    );
  }
}
