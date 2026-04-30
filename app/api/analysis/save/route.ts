import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import { isServerMode } from "@/lib/config";

export async function POST(request: NextRequest) {
  if (!isServerMode()) {
    return NextResponse.json({ error: "Not available in local mode" }, { status: 400 });
  }

  try {
    const { userId, title, summary, articleText, narratorVoice, readingMode, ttsModel, segments } =
      await request.json();

    const db = await getDBWithMigration();

    // Insert analysis record
    const result = await db.prepare(`
      INSERT INTO analysis_records (user_id, title, summary, article_text, narrator_voice, reading_mode, tts_model, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'analyzed')
    `).bind(
      userId || null,
      title || "",
      summary || "",
      articleText || "",
      narratorVoice || "",
      readingMode || "ai",
      ttsModel || "mimo-v2.5-tts-voicedesign"
    ).run();

    const analysisId = result.meta.last_row_id;

    // Insert segments
    if (segments && Array.isArray(segments)) {
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        await db.prepare(`
          INSERT INTO audio_segments (analysis_id, segment_index, character_name, character_id, type, text, voice_description, style_instruction)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          analysisId,
          i,
          seg.character || "",
          seg.characterId || "",
          seg.type || "narration",
          seg.text || "",
          seg.voiceDescription || "",
          seg.styleInstruction || ""
        ).run();
      }
    }

    return NextResponse.json({ analysisId });
  } catch (error) {
    console.error("Save analysis error:", error);
    return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 });
  }
}
