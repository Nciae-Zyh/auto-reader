import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAudio } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const db = await getDBWithMigration();
    const user = await getCurrentUser(db, cookieHeader);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const recordId = url.searchParams.get("recordId");

    if (!recordId) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    // Get the record
    const record = await db
      .prepare(
        "SELECT * FROM generation_records WHERE id = ? AND user_id = ?"
      )
      .bind(parseInt(recordId), user.id)
      .first<{ audio_file_key: string; title: string }>();

    if (!record) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    if (!record.audio_file_key) {
      return NextResponse.json(
        { error: "No audio file available" },
        { status: 404 }
      );
    }

    // Get audio from storage
    const audio = await getAudio(undefined, record.audio_file_key);

    if (!audio) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    // Return audio file
    const filename = record.title
      ? `${record.title}.wav`
      : `audio_${recordId}.wav`;

    return new NextResponse(audio.data, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download audio" },
      { status: 500 }
    );
  }
}
