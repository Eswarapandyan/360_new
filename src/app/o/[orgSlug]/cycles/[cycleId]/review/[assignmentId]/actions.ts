"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface SubmitReviewState {
  error: string | null;
}

export async function submitReview(
  orgSlug: string,
  cycleId: string,
  assignmentId: string,
  questionIds: string[],
  _prevState: SubmitReviewState,
  formData: FormData,
): Promise<SubmitReviewState> {
  const supabase = await createClient();

  const rows = questionIds.map((questionId) => {
    const ratingRaw = formData.get(`rating_${questionId}`);
    const textRaw = formData.get(`text_${questionId}`);
    return {
      assignment_id: assignmentId,
      question_id: questionId,
      rating_value: ratingRaw ? Number(ratingRaw) : null,
      text_value: textRaw ? String(textRaw) : null,
    };
  });

  const { error: upsertError } = await supabase
    .from("responses")
    .upsert(rows, { onConflict: "assignment_id,question_id" });

  if (upsertError) {
    return { error: upsertError.message };
  }

  const { error: statusError } = await supabase
    .from("assignments")
    .update({ status: "submitted" })
    .eq("id", assignmentId);

  if (statusError) {
    return { error: statusError.message };
  }

  redirect(`/o/${orgSlug}/cycles/${cycleId}`);
}
