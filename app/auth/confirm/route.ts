import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "../../../lib/supabase/server";
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await serverClient();
  const result = tokenHash ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
    : code ? await supabase.auth.exchangeCodeForSession(code) : null;
  const response = NextResponse.redirect(new URL(result && !result.error ? "/" : "/auth/confirmation-error", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
