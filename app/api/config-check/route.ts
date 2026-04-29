import { NextResponse } from "next/server";
import { isServerMode, isGoogleAuthEnabled, getGoogleClientId } from "@/lib/config";

export async function GET() {
  // Only expose non-sensitive info to the frontend
  return NextResponse.json({
    serverMode: isServerMode(),
    googleAuthEnabled: isGoogleAuthEnabled(),
    googleClientId: getGoogleClientId(),
  });
}
