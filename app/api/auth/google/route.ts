import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import {
  exchangeGoogleCode,
  upsertGoogleUser,
  createSessionCookies,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 }
      );
    }

    // Exchange code for user info
    const googleUser = await exchangeGoogleCode(
      code,
      clientId,
      clientSecret,
      redirectUri || `${request.nextUrl.origin}/api/auth/google/callback`
    );

    // Get database
    const db = await getDBWithMigration();

    // Upsert user
    const user = await upsertGoogleUser(db, googleUser);

    // Create session cookies
    const token = crypto.randomUUID();
    const cookies = createSessionCookies(user.id, token);

    // Return user info with Set-Cookie headers
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });

    cookies.forEach((cookie) => {
      response.headers.append("Set-Cookie", cookie);
    });

    return response;
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed" },
      { status: 500 }
    );
  }
}
