import { NextResponse } from "next/server";
import { isServerMode, isGoogleAuthEnabled } from "@/lib/config";

export async function GET() {
  // Only expose non-sensitive info to the frontend
  return NextResponse.json({
    serverMode: isServerMode(),
    googleAuthEnabled: isGoogleAuthEnabled(),
    // Only expose Google Client ID (needed for OAuth flow)
    // NEVER expose API keys or secrets
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  });
}
