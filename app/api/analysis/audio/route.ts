import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import { isServerMode } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { saveAudioFromBase64, generateAudioKey } from "@/lib/storage";

export async function POST(request: NextRequest) {
  if (!isServerMode()) {
    return NextResponse.json({ error: "Not available in local mode" }, { status: 400 });
  }

  try {
    const { analysisId, segmentIndex, audioBase64, isMerged } = await request.json();

    if (!analysisId || audioBase64 === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cookieHeader = request.headers.get("cookie");
    const db = await getDBWithMigration();
    const user = await getCurrentUser(db, cookieHeader);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Verify user owns this analysis
    const analysis = await db.prepare(
      "SELECT user_id FROM analysis_records WHERE id = ? AND user_id = ?"
    ).bind(analysisId, user.id).first<{ user_id: number }>();

    if (!analysis) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const key = generateAudioKey(user.id, analysisId, isMerged ? undefined : segmentIndex);

    // Save audio to storage
    await saveAudioFromBase64(key, audioBase64);

    if (isMerged) {
      await db.prepare("UPDATE analysis_records SET merged_audio_key = ?, status = 'completed' WHERE id = ?")
        .bind(key, analysisId).run();
    } else if (segmentIndex !== undefined) {
      await db.prepare("UPDATE audio_segments SET audio_file_key = ? WHERE analysis_id = ? AND segment_index = ?")
        .bind(key, analysisId, segmentIndex).run();
    }

    return NextResponse.json({ key });
  } catch (error) {
    console.error("Save audio error:", error);
    return NextResponse.json({ error: "Failed to save audio" }, { status: 500 });
  }
}
