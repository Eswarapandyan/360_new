"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export interface CreateOrgState {
  error: string | null;
}

export async function createOrganization(
  _prevState: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    return { error: "Give your organization a name." };
  }

  const supabase = await createClient();
  const slug = slugify(name);

  const { error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_slug: slug,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/o/${slug}/dashboard`);
}
