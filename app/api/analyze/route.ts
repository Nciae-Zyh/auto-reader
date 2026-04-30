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
      return NextResponse.json({ error: "文章内容和 API Key 为必填项" }, { status: 400 });
    }

    const serverMode = isServerMode();
    let rateLimitInfo = null;
    let userId: number | null = null;
    let ip = "";

    if (serverMode) {
      const db = await getDBWithMigration();
      const cookieHeader = request.headers.get("cookie");
      const user = await getCurrentUser(db, cookieHeader);
      userId = user?.id || null;
      ip = getClientIp(request);
      const identifier = userId ? `user:${userId}` : `ip:${ip}`;

      const rateLimit = await checkRateLimit(db, identifier, !!user);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: "今日使用次数已用完，请登录后继续使用", rateLimit: { used: rateLimit.used, remaining: rateLimit.remaining, limit: 5 } },
          { status: 429 }
        );
      }
      await recordUsage(db, identifier, userId, "analyze", ip);
      rateLimitInfo = { used: rateLimit.used + 1, remaining: rateLimit.remaining - 1, limit: 5 };
    }

    const result = await analyzeArticle(article, apiKey, finalBaseUrl);

    // Save to database in server mode
    let analysisId: number | null = null;
    if (serverMode) {
      const db = await getDBWithMigration();

      // 1. Insert summary record
      const insertResult = await db.prepare(`
        INSERT INTO analysis_records (user_id, ip_address, title, summary, segment_count, reading_mode, tts_model, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'analyzed')
      `).bind(
        userId, ip, result.title || "", result.summary || "",
        result.segments?.length || 0, "ai", "mimo-v2.5-tts-voicedesign"
      ).run();
      analysisId = insertResult.meta.last_row_id;

      // 2. Insert article content
      await db.prepare(`
        INSERT INTO article_contents (analysis_id, article_text, narrator_voice)
        VALUES (?, ?, ?)
      `).bind(analysisId, article, result.narratorVoice || "").run();

      // 3. Insert segments
      if (result.segments && Array.isArray(result.segments)) {
        for (let i = 0; i < result.segments.length; i++) {
          const seg = result.segments[i];
          await db.prepare(`
            INSERT INTO audio_segments (analysis_id, segment_index, character_name, character_id, segment_type, text, voice_description, style_instruction)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(analysisId, i, seg.character || "", seg.characterId || "", seg.type || "narration", seg.text || "", seg.voiceDescription || "", seg.styleInstruction || "").run();
        }
      }
    }

    return NextResponse.json({ ...result, analysisId, ...(rateLimitInfo && { rateLimit: rateLimitInfo }) });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "分析失败" }, { status: 500 });
  }
}
