import { getDBWithMigration } from "./db";
import { ttsCompletion } from "./mimo-client";
import { saveAudioFromBase64, generateAudioKey, getAudioAsBase64 } from "./storage";
import { splitTextForTTS } from "./text-splitter";
import { mergeWavBase64 } from "./audio-utils";
import type { TTSModel } from "./types";

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
      const apiKey = process.env.MIMO_API_KEY;

      if (!apiKey) continue;

      const priorForCharacter = await db.prepare(`
        SELECT audio_file_key
        FROM audio_segments
        WHERE analysis_id = ? AND character_id = ? AND segment_index < ?
          AND audio_file_key IS NOT NULL AND audio_file_key != ''
        ORDER BY segment_index
        LIMIT 1
      `).bind(seg.analysis_id, seg.character_id, seg.segment_index).first<{ audio_file_key: string }>();

      // Determine model. The first segment of each character must be voice design.
      const isFirstOfCharacter = !priorForCharacter;
      const effectiveModel = isFirstOfCharacter
        ? "mimo-v2.5-tts-voicedesign"
        : "mimo-v2.5-tts-voiceclone";
      const referenceAudio = priorForCharacter?.audio_file_key
        ? await getAudioAsBase64(priorForCharacter.audio_file_key)
        : undefined;
      const voiceCloneReference = referenceAudio || undefined;

      const textChunks = splitTextForTTS(seg.text as string);
      const audioChunks: string[] = [];

      for (const text of textChunks) {
        audioChunks.push(await ttsCompletion(
          apiKey,
          effectiveModel as TTSModel,
          {
            text,
            voiceDescription:
              effectiveModel === "mimo-v2.5-tts-voicedesign"
                ? (seg.voice_description as string)
                : undefined,
            styleInstruction:
              effectiveModel !== "mimo-v2.5-tts-voicedesign"
                ? (seg.style_instruction as string)
                : undefined,
            referenceAudio:
              effectiveModel === "mimo-v2.5-tts-voiceclone"
                ? voiceCloneReference
                : undefined,
            format: "wav",
          }
        ));
      }

      const audioBase64 = mergeWavBase64(audioChunks);

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
