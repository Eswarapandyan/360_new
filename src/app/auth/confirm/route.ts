import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The Supabase magic-link email points here with token_hash + type.
// This route verifies the OTP server-side and establishes the session
// cookie before redirecting on -- see Supabase's Next.js App Router
// server-side auth guide for why this shape (not a client-side exchange).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // `next` is a full absolute URL here (it's whatever was passed as
  // emailRedirectTo, threaded through via {{ .RedirectTo }} in the email
  // template), not a relative path -- redirect to it as-is.
  const next = searchParams.get("next") ?? `${origin}/onboarding`;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(next);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
