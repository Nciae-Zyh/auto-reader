import { NextResponse } from "next/server";

export async function GET() {
  // Check for Google Client ID from either build-time or runtime
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    "";

  // Check server mode
  const serverMode =
    process.env.SERVER_MODE === "true" ||
    process.env.SERVER_MODE === "1" ||
    process.env.NEXT_PUBLIC_SERVER_MODE === "true" ||
    !!process.env.MIMO_API_KEY;

  // Check if Google OAuth is configured
  const googleAuthEnabled = !!(
    googleClientId &&
    (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)
  );

  return NextResponse.json({
    serverMode,
    googleAuthEnabled,
    googleClientId,
  });
}
