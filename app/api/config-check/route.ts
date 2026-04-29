import { NextResponse } from "next/server";
import { isServerMode, isGoogleAuthEnabled, getServerConfig } from "@/lib/config";

export async function GET() {
  const serverConfig = getServerConfig();

  return NextResponse.json({
    serverMode: isServerMode(),
    googleAuthEnabled: isGoogleAuthEnabled(),
    hasApiKey: !!serverConfig.apiKey,
    hasBaseUrl: !!serverConfig.baseUrl,
  });
}
