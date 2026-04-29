import { NextRequest, NextResponse } from "next/server";
import { analyzeArticle } from "@/lib/analyzer";
import { getServerConfig } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { article, apiKey, baseUrl } = await request.json();
    const serverConfig = getServerConfig();

    const finalApiKey = serverConfig.apiKey || apiKey;
    const finalBaseUrl = serverConfig.baseUrl || baseUrl;

    if (!article || !finalApiKey) {
      return NextResponse.json(
        { error: "文章内容和 API Key 为必填项" },
        { status: 400 }
      );
    }

    const result = await analyzeArticle(article, finalApiKey, finalBaseUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分析失败" },
      { status: 500 }
    );
  }
}
