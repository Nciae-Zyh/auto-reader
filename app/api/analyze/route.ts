import { NextRequest, NextResponse } from "next/server";
import { analyzeArticle } from "@/lib/analyzer";
import { getServerConfig } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { article, baseUrl } = await request.json();
    const serverConfig = getServerConfig();

    // Always use server-side API key, never from request
    const apiKey = serverConfig.apiKey;
    const finalBaseUrl = serverConfig.baseUrl || baseUrl;

    if (!article || !apiKey) {
      return NextResponse.json(
        { error: "文章内容和 API Key 为必填项" },
        { status: 400 }
      );
    }

    const result = await analyzeArticle(article, apiKey, finalBaseUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分析失败" },
      { status: 500 }
    );
  }
}
