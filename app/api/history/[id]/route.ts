import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAudioAsBase64 } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get("cookie");
    const db = await getDBWithMigration();
    const user = await getCurrentUser(db, cookieHeader);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get analysis record
    const analysis = await db.prepare(
      "SELECT * FROM analysis_records WHERE id = ? AND user_id = ?"
    ).bind(parseInt(id), user.id).first();

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // Get article content
    const articleContent = await db.prepare(
      "SELECT article_text, narrator_voice FROM article_contents WHERE analysis_id = ?"
    ).bind(parseInt(id)).first<{ article_text: string; narrator_voice: string }>();

    // Get segments
    const { results: segments } = await db.prepare(
      "SELECT * FROM audio_segments WHERE analysis_id = ? ORDER BY segment_index"
    ).bind(parseInt(id)).all();

    // Get merged audio if available
    let mergedAudioBase64 = null;
    if ((analysis as Record<string, unknown>).merged_audio_key) {
      mergedAudioBase64 = await getAudioAsBase64(
        (analysis as Record<string, unknown>).merged_audio_key as string
      );
    }

    return NextResponse.json({
      analysis,
      article: articleContent,
      segments,
      mergedAudio: mergedAudioBase64,
    });
  } catch (error) {
    console.error("Get analysis error:", error);
    return NextResponse.json({ error: "Failed to get analysis" }, { status: 500 });
  }
}
