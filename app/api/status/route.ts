import { NextResponse } from "next/server";

export async function GET() {
  // Check if API key is configured on the server
  const hasApiKey = !!process.env.MIMO_API_KEY;

  // Check server mode from various sources
  const serverMode =
    process.env.SERVER_MODE === "true" ||
    process.env.SERVER_MODE === "1" ||
    process.env.NEXT_PUBLIC_SERVER_MODE === "true" ||
    !!process.env.MIMO_API_KEY;

  // Check Google OAuth - check both possible env var names
  const hasGoogleClientId = !!(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  );
  const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  const googleAuthEnabled = hasGoogleClientId && hasGoogleClientSecret;

  return NextResponse.json({
    hasApiKey,
    serverMode,
    googleAuthEnabled,
  });
}
