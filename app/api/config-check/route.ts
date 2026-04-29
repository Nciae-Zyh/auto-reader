import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";

export async function GET() {
  const serverConfig = getServerConfig();
  return NextResponse.json({
    serverMode: !!serverConfig.apiKey,
    hasApiKey: !!serverConfig.apiKey,
    hasBaseUrl: !!serverConfig.baseUrl,
  });
}
