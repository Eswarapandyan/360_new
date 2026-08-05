"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CreateCycleState {
  error: string | null;
}

export async function createCycle(
  orgSlug: string,
  orgId: string,
  _prevState: CreateCycleState,
  formData: FormData,
): Promise<CreateCycleState> {
  const name = String(formData.get("name") || "").trim();
  const threshold = Number(formData.get("min_responses_for_disclosure")) || 3;

  if (!name) {
    return { error: "Give the cycle a name." };
  }

  const supabase = await createClient();

  const { data: cycle, error } = await supabase
    .from("review_cycles")
    .insert({
      org_id: orgId,
      name,
      min_responses_for_disclosure: threshold,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/o/${orgSlug}/cycles/${cycle.id}`);
}
