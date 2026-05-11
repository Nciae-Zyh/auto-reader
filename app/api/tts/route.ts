import { NextRequest, NextResponse } from "next/server";
import { ttsCompletion } from "@/lib/mimo-client";
import { getServerConfig, isServerMode } from "@/lib/config";
import { splitTextForTTS } from "@/lib/text-splitter";
import { getDBWithMigration } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, recordUsage, getClientIp } from "@/lib/rate-limit";
import { saveAudioFromBase64, generateAudioKey } from "@/lib/storage";
import { mergeWavBase64 } from "@/lib/audio-utils";
import type { TTSModel, ArticleSegment } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { segment, model, baseUrl, referenceAudio, effectiveModel, analysisId, segmentIndex } =
      (await request.json()) as {
        segment: ArticleSegment;
        model: TTSModel;
        baseUrl?: string;
        referenceAudio?: string;
        effectiveModel?: TTSModel;
        analysisId?: number;
        segmentIndex?: number;
      };
    const serverConfig = getServerConfig();
    const apiKey = serverConfig.apiKey;
    const finalBaseUrl = serverConfig.baseUrl || baseUrl;

    if (!segment || !apiKey) {
      return NextResponse.json(
        { error: "分段内容和 API Key 为必填项" },
        { status: 400 }
      );
    }

    const serverMode = isServerMode();
    let rateLimitInfo = null;
    let userId: number | null = null;

    // Rate limiting only in server mode
    if (serverMode) {
      const db = await getDBWithMigration();
      const cookieHeader = request.headers.get("cookie");
      const user = await getCurrentUser(db, cookieHeader);
      userId = user?.id || null;
      const ip = getClientIp(request);
      const identifier = userId ? `user:${userId}` : `ip:${ip}`;

      const rateLimit = await checkRateLimit(db, identifier, !!user);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: "今日使用次数已用完，请登录后继续使用",
            rateLimit: { used: rateLimit.used, remaining: rateLimit.remaining, limit: 5 },
          },
          { status: 429 }
        );
      }

      await recordUsage(db, identifier, userId, "tts", ip);

      rateLimitInfo = {
        used: rateLimit.used + 1,
        remaining: rateLimit.remaining - 1,
        limit: 5,
      };
    }

    const useModel = effectiveModel || model;
    const textChunks = splitTextForTTS(segment.text);
    let audioBase64: string;

    if (textChunks.length === 1) {
      audioBase64 = await ttsCompletion(
        apiKey,
        useModel,
        {
          text: segment.text,
          voiceDescription: useModel === "mimo-v2.5-tts-voicedesign" ? segment.voiceDescription : undefined,
          styleInstruction: useModel !== "mimo-v2.5-tts-voicedesign" ? segment.styleInstruction : undefined,
          referenceAudio: useModel === "mimo-v2.5-tts-voiceclone" ? referenceAudio : undefined,
          format: "wav",
        },
        finalBaseUrl
      );
    } else {
      const audioChunks: string[] = [];
      for (const chunk of textChunks) {
        const chunkAudio = await ttsCompletion(
          apiKey,
          useModel,
          {
            text: chunk,
            voiceDescription: useModel === "mimo-v2.5-tts-voicedesign" ? segment.voiceDescription : undefined,
            styleInstruction: useModel !== "mimo-v2.5-tts-voicedesign" ? segment.styleInstruction : undefined,
            referenceAudio: useModel === "mimo-v2.5-tts-voiceclone" ? referenceAudio : undefined,
            format: "wav",
          },
          finalBaseUrl
        );
        audioChunks.push(chunkAudio);
      }
      audioBase64 = mergeWavBase64(audioChunks);
    }

    // Save audio to storage and update database in server mode
    if (serverMode && analysisId !== undefined && segmentIndex !== undefined) {
      try {
        const db = await getDBWithMigration();

        // Get analysis to find user_id
        const analysis = await db.prepare("SELECT user_id FROM analysis_records WHERE id = ?")
          .bind(analysisId)
          .first<{ user_id: number }>();

        const uid = analysis?.user_id || userId || 0;
        const key = generateAudioKey(uid, analysisId, segmentIndex);

        // Save to storage
        await saveAudioFromBase64(key, audioBase64);

        // Update database
        await db.prepare("UPDATE audio_segments SET audio_file_key = ? WHERE analysis_id = ? AND segment_index = ?")
          .bind(key, analysisId, segmentIndex).run();
      } catch (saveError) {
        console.error("Save audio error:", saveError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      audioBase64,
      ...(rateLimitInfo && { rateLimit: rateLimitInfo }),
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "语音合成失败" },
      { status: 500 }
    );
  }
}
