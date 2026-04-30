import { NextRequest, NextResponse } from "next/server";
import { getDBWithMigration } from "@/lib/db";
import {
  exchangeGoogleCode,
  upsertGoogleUser,
  createSessionCookies,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL("/login?error=no_code", request.url));
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_not_configured", request.url)
      );
    }

    const redirectUri = `${url.origin}/api/auth/google/callback`;

    // Exchange code for user info
    const googleUser = await exchangeGoogleCode(
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    // Get database
    const db = await getDBWithMigration();

    // Upsert user
    const user = await upsertGoogleUser(db, googleUser);

    // Create session cookies
    const token = crypto.randomUUID();
    const cookies = createSessionCookies(user.id, token);

    // Redirect to home page with cookies
    const response = NextResponse.redirect(new URL("/", request.url));

    cookies.forEach((cookie) => {
      response.headers.append("Set-Cookie", cookie);
    });

    return response;
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(String(error))}`, request.url)
    );
  }
}
