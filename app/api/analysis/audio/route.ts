import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import { isServerMode } from "@/lib/config";
import { saveAudioFromBase64, generateAudioKey } from "@/lib/storage";
import type { CloudflareEnv } from "@/lib/db-types";

export async function POST(request: NextRequest) {
  if (!isServerMode()) {
    return NextResponse.json({ error: "Not available in local mode" }, { status: 400 });
  }

  try {
    const { analysisId, segmentIndex, audioBase64, isMerged } = await request.json();

    if (!analysisId || audioBase64 === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDBWithMigration();

    // Get analysis record to find user_id
    const analysis = await db.prepare("SELECT user_id FROM analysis_records WHERE id = ?")
      .bind(analysisId)
      .first<{ user_id: number }>();

    if (!analysis) {
      return NextResponse.json({ error: "Analysis record not found" }, { status: 404 });
    }

    const userId = analysis.user_id || 0;
    const key = generateAudioKey(userId, analysisId, isMerged ? undefined : segmentIndex);

    // Save audio to storage (R2 or local)
    await saveAudioFromBase64(undefined, key, audioBase64);

    if (isMerged) {
      // Update merged audio key
      await db.prepare("UPDATE analysis_records SET merged_audio_key = ?, status = 'completed' WHERE id = ?")
        .bind(key, analysisId).run();
    } else if (segmentIndex !== undefined) {
      // Update segment audio key
      await db.prepare("UPDATE audio_segments SET audio_file_key = ? WHERE analysis_id = ? AND segment_index = ?")
        .bind(key, analysisId, segmentIndex).run();
    }

    return NextResponse.json({ key });
  } catch (error) {
    console.error("Save audio error:", error);
    return NextResponse.json({ error: "Failed to save audio" }, { status: 500 });
  }
}
