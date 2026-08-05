import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, organizations(slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const org = membership?.organizations as { slug: string } | null | undefined;
  if (org?.slug) {
    redirect(`/o/${org.slug}/dashboard`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <OnboardingForm />
    </div>
  );
}
