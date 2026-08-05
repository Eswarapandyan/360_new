import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/org";
import { ReviewForm, type QuestionWithCompetency } from "./review-form";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; cycleId: string; assignmentId: string }>;
}) {
  const { orgSlug, cycleId, assignmentId } = await params;
  const supabase = await createClient();
  const { org } = await requireOrgMember(supabase, orgSlug);

  // RLS (assignments_reviewer_select) already ensures this only returns a
  // row if the signed-in user is the reviewer on it -- a null result here
  // means either it doesn't exist or it isn't theirs, and 404 is the right
  // response either way.
  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "id, relationship_type, status, reviewee:org_members!assignments_reviewee_id_fkey(display_name)",
    )
    .eq("id", assignmentId)
    .eq("cycle_id", cycleId)
    .maybeSingle();

  if (!assignment) {
    notFound();
  }

  const revieweeName =
    (assignment.reviewee as unknown as { display_name: string } | null)
      ?.display_name ?? "yourself";

  const [{ data: questions }, { data: existingResponses }] = await Promise.all(
    [
      supabase
        .from("questions")
        .select("id, text, question_type, sort_order, competencies(name)")
        .eq("org_id", org.id)
        .contains("applies_to", [assignment.relationship_type])
        .order("sort_order"),
      supabase
        .from("responses")
        .select("question_id, rating_value, text_value")
        .eq("assignment_id", assignmentId),
    ],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Reviewing {revieweeName}
        </h1>
        <p className="text-sm capitalize text-muted-foreground">
          {assignment.relationship_type.replace("_", " ")} feedback
        </p>
      </div>
      <ReviewForm
        orgSlug={orgSlug}
        cycleId={cycleId}
        assignmentId={assignmentId}
        questions={(questions as unknown as QuestionWithCompetency[]) || []}
        existingResponses={existingResponses || []}
        alreadySubmitted={assignment.status === "submitted"}
      />
    </div>
  );
}
