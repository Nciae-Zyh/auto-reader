import { NextRequest, NextResponse } from "next/server";
import { isBackgroundWorkerEnabled, processPendingTasks } from "@/lib/background-worker";

export async function POST(request: NextRequest) {
  if (!isBackgroundWorkerEnabled()) {
    return NextResponse.json({ error: "Background worker not enabled" }, { status: 400 });
  }

  try {
    const processed = await processPendingTasks();
    return NextResponse.json({ processed, message: `Processed ${processed} segments` });
  } catch (error) {
    console.error("Worker error:", error);
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    enabled: isBackgroundWorkerEnabled(),
    message: isBackgroundWorkerEnabled()
      ? "Background worker is enabled"
      : "Background worker is disabled. Set BACKGROUND_WORKER=true to enable.",
  });
}
