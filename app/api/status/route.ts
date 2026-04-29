import { NextResponse } from "next/server";

export async function GET() {
  // Check if API key is configured on the server
  const hasApiKey = !!process.env.MIMO_API_KEY;
  const serverMode = !!(
    process.env.SERVER_MODE === "true" ||
    process.env.SERVER_MODE === "1" ||
    process.env.MIMO_API_KEY
  );
  const googleAuthEnabled = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return NextResponse.json({
    hasApiKey,
    serverMode,
    googleAuthEnabled,
    // Never expose the actual API key or secrets
  });
}
