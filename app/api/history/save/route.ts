import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import { getCurrentUser, saveGenerationRecord } from "@/lib/auth";
import { saveAudio, generateAudioKey } from "@/lib/storage";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      title,
      articleText,
      readingMode,
      ttsModel,
      segmentCount,
      audioBase64,
    } = body;

    // Save generation record
    const recordId = await saveGenerationRecord(db, user.id, {
      title: title || "",
      articleText: articleText || "",
      readingMode: readingMode || "ai",
      ttsModel: ttsModel || "mimo-v2.5-tts-voicedesign",
      status: audioBase64 ? "completed" : "pending",
      audioFileKey: "",
      segmentCount: segmentCount || 0,
    });

    // Save audio file if provided
    let audioKey = "";
    if (audioBase64) {
      audioKey = generateAudioKey(user.id, recordId);
      const audioBuffer = Buffer.from(audioBase64, "base64");
      await saveAudio(undefined, audioKey, audioBuffer);
    }

    return NextResponse.json({ recordId, audioKey });
  } catch (error) {
    console.error("Save history error:", error);
    return NextResponse.json(
      { error: "Failed to save history" },
      { status: 500 }
    );
  }
}
