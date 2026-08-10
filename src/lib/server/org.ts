import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrgMember } from "@/lib/types";

export interface OrgContext {
  org: { id: string; name: string; slug: string };
  member: OrgMember;
}

// Every /o/[orgSlug] page starts by calling this: resolves the org from the
// URL slug and confirms the signed-in user is actually a member of it. RLS
// on `organizations`/`org_members` already enforces this at the DB layer --
// this just turns "query returned nothing" into a proper redirect/404
// instead of a page rendering with missing data.
export async function requireOrgMember(
  supabase: SupabaseClient,
  orgSlug: string,
): Promise<OrgContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/o/${orgSlug}/dashboard`);
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!org) {
    notFound();
  }

  const { data: member } = await supabase
    .from("org_members")
    .select("*")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    notFound();
  }

  return { org, member: member as OrgMember };
}
