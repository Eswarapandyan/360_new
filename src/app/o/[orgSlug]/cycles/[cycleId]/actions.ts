"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RelationshipType } from "@/lib/types";

export interface AssignmentState {
  error: string | null;
}

export async function createAssignment(
  orgSlug: string,
  orgId: string,
  cycleId: string,
  _prevState: AssignmentState,
  formData: FormData,
): Promise<AssignmentState> {
  const revieweeId = String(formData.get("reviewee_id") || "");
  const reviewerId = String(formData.get("reviewer_id") || "");
  const relationshipType = String(
    formData.get("relationship_type") || "",
  ) as RelationshipType;

  if (!revieweeId || !reviewerId || !relationshipType) {
    return { error: "Pick a reviewee, reviewer, and relationship type." };
  }

  if (revieweeId === reviewerId && relationshipType !== "self") {
    return { error: "A person reviewing themselves must use relationship type 'self'." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("assignments").insert({
    org_id: orgId,
    cycle_id: cycleId,
    reviewee_id: revieweeId,
    reviewer_id: reviewerId,
    relationship_type: relationshipType,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/o/${orgSlug}/cycles/${cycleId}`);
  return { error: null };
}

export async function setCycleStatus(
  orgSlug: string,
  cycleId: string,
  status: "draft" | "active" | "closed",
) {
  const supabase = await createClient();
  await supabase.from("review_cycles").update({ status }).eq("id", cycleId);
  revalidatePath(`/o/${orgSlug}/cycles/${cycleId}`);
}
