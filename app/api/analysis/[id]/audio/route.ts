import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import { isServerMode } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { getAudio } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isServerMode()) {
    return NextResponse.json({ error: "Not available in local mode" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const segmentIndex = url.searchParams.get("segment");
    const cookieHeader = request.headers.get("cookie");
    const db = await getDBWithMigration();
    const user = await getCurrentUser(db, cookieHeader);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Verify user owns this analysis
    const ownership = await db.prepare(
      "SELECT id FROM analysis_records WHERE id = ? AND user_id = ?"
    ).bind(parseInt(id), user.id).first();

    if (!ownership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (segmentIndex !== null) {
      const segment = await db.prepare(
        "SELECT audio_file_key, text FROM audio_segments WHERE analysis_id = ? AND segment_index = ?"
      ).bind(parseInt(id), parseInt(segmentIndex)).first<{ audio_file_key: string; text: string }>();

      if (!segment?.audio_file_key) {
        return NextResponse.json({ error: "Audio not found" }, { status: 404 });
      }

      const audio = await getAudio(segment.audio_file_key);
      if (!audio) {
        return NextResponse.json({ error: "Audio file not found" }, { status: 404 });
      }

      return new NextResponse(audio.data, {
        headers: { "Content-Type": "audio/wav", "Content-Disposition": `attachment; filename="segment_${segmentIndex}.wav"` },
      });
    } else {
      const analysis = await db.prepare("SELECT merged_audio_key, title FROM analysis_records WHERE id = ?")
        .bind(parseInt(id)).first<{ merged_audio_key: string; title: string }>();

      if (!analysis?.merged_audio_key) {
        return NextResponse.json({ error: "Merged audio not found" }, { status: 404 });
      }

      const audio = await getAudio(analysis.merged_audio_key);
      if (!audio) {
        return NextResponse.json({ error: "Audio file not found" }, { status: 404 });
      }

      const filename = analysis.title ? `${analysis.title}.wav` : `audio_${id}.wav`;
      return new NextResponse(audio.data, {
        headers: { "Content-Type": "audio/wav", "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"` },
      });
    }
  } catch (error) {
    console.error("Download audio error:", error);
    return NextResponse.json({ error: "Failed to download audio" }, { status: 500 });
  }
}
