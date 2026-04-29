import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear cookies
  response.headers.append(
    "Set-Cookie",
    "auth_token=; Path=/; HttpOnly; Max-Age=0"
  );
  response.headers.append(
    "Set-Cookie",
    "user_id=; Path=/; Max-Age=0"
  );

  return response;
}
