"use server";

import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
  sent: boolean;
}

export async function sendMagicLink(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address.", sent: false };
  }

  const supabase = await createClient();
  const next = String(formData.get("next") || "/onboarding");

  // This becomes {{ .RedirectTo }} in the magic_link email template, which
  // points at our own /auth/confirm route (token_hash + type) rather than
  // GoTrue's hosted /verify endpoint -- see supabase/templates/magic_link.html.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}${next}`,
    },
  });

  if (error) {
    return { error: error.message, sent: false };
  }

  return { error: null, sent: true };
}
