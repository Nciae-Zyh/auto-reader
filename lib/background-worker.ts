import { getDBWithMigration } from "./db";
import { ttsCompletion } from "./mimo-client";
import { saveAudioFromBase64, generateAudioKey } from "./storage";
import type { TTSModel } from "./types";

interface PendingTask {
  id: number;
  analysis_id: number;
  segment_index: number;
  segment_data: string;
}

/**
 * Check if background worker is enabled (Docker mode only)
 */
export function isBackgroundWorkerEnabled(): boolean {
  return (
    process.env.BACKGROUND_WORKER === "true" ||
    (process.env.NODE_ENV === "production" && !process.env.CLOUDFLARE)
  );
}

/**
 * Process pending generation tasks in the background
 */
export async function processPendingTasks(): Promise<number> {
  if (!isBackgroundWorkerEnabled()) {
    return 0;
  }

  const db = await getDBWithMigration();

  // Get pending segments that need generation
  const { results: pendingSegments } = await db.prepare(`
    SELECT as2.id, as2.analysis_id, as2.segment_index, as2.text, as2.voice_description,
           as2.style_instruction, as2.character_id, as2.segment_type,
           ar.tts_model, ar.user_id
    FROM audio_segments as2
    JOIN analysis_records ar ON ar.id = as2.analysis_id
    WHERE as2.audio_file_key = '' OR as2.audio_file_key IS NULL
    ORDER BY as2.analysis_id, as2.segment_index
    LIMIT 10
  `).all();

  let processed = 0;

  for (const segment of pendingSegments) {
    try {
      const seg = segment as Record<string, unknown>;
      const ttsModel = (seg.tts_model as string) || "mimo-v2.5-tts-voicedesign";
      const apiKey = process.env.MIMO_API_KEY;

      if (!apiKey) continue;

      // Determine model
      const isFirstOfCharacter = seg.segment_index === 0;
      const effectiveModel = isFirstOfCharacter
        ? "mimo-v2.5-tts-voicedesign"
        : "mimo-v2.5-tts-voiceclone";

      // Generate audio
      const audioBase64 = await ttsCompletion(
        apiKey,
        effectiveModel as TTSModel,
        {
          text: seg.text as string,
          voiceDescription:
            effectiveModel === "mimo-v2.5-tts-voicedesign"
              ? (seg.voice_description as string)
              : undefined,
          styleInstruction:
            effectiveModel !== "mimo-v2.5-tts-voicedesign"
              ? (seg.style_instruction as string)
              : undefined,
          format: "wav",
        }
      );

      // Save to storage
      const userId = (seg.user_id as number) || 0;
      const key = generateAudioKey(userId, seg.analysis_id as number, seg.segment_index as number);
      await saveAudioFromBase64(key, audioBase64);

      // Update database
      await db.prepare(
        "UPDATE audio_segments SET audio_file_key = ? WHERE id = ?"
      ).bind(key, seg.id).run();

      processed++;
    } catch (error) {
      console.error("[BackgroundWorker] Failed to process segment:", error);
    }
  }

  return processed;
}

/**
 * Check if all segments for an analysis are complete
 */
export async function checkAnalysisComplete(analysisId: number): Promise<boolean> {
  const db = await getDBWithMigration();

  const pending = await db.prepare(
    "SELECT COUNT(*) as count FROM audio_segments WHERE analysis_id = ? AND (audio_file_key = '' OR audio_file_key IS NULL)"
  ).bind(analysisId).first<{ count: number }>();

  return (pending?.count || 0) === 0;
}
