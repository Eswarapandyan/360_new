import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/server/org";
import type { OrgMember, ReviewCycle } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssignmentForm } from "./_components/assignment-form";
import { CycleStatusButtons } from "./_components/cycle-status-buttons";

interface AssignmentRow {
  id: string;
  relationship_type: string;
  status: string;
  reviewee: { display_name: string } | null;
  reviewer: { display_name: string } | null;
}

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; cycleId: string }>;
}) {
  const { orgSlug, cycleId } = await params;
  const supabase = await createClient();
  const { org, member } = await requireOrgMember(supabase, orgSlug);

  const { data: cycle } = await supabase
    .from("review_cycles")
    .select("*")
    .eq("id", cycleId)
    .eq("org_id", org.id)
    .maybeSingle();

  if (!cycle) {
    notFound();
  }

  const isAdmin = member.role === "admin";

  const [{ data: members }, { data: myAssignments }, adminAssignments] =
    await Promise.all([
      supabase
        .from("org_members")
        .select("*")
        .eq("org_id", org.id)
        .order("display_name"),
      supabase
        .from("assignments")
        .select("*")
        .eq("cycle_id", cycleId)
        .eq("reviewer_id", member.id),
      isAdmin
        ? supabase
            .from("assignments")
            .select(
              "id, relationship_type, status, reviewee:org_members!assignments_reviewee_id_fkey(display_name), reviewer:org_members!assignments_reviewer_id_fkey(display_name)",
            )
            .eq("cycle_id", cycleId)
        : Promise.resolve({ data: null }),
    ]);

  const cycleTyped = cycle as ReviewCycle;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{cycleTyped.name}</h1>
          <Badge variant="outline">{cycleTyped.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <CycleStatusButtons
              orgSlug={orgSlug}
              cycleId={cycleId}
              status={cycleTyped.status}
            />
          )}
          <Link
            href={`/o/${orgSlug}/cycles/${cycleId}/results`}
            className={buttonVariants({ size: "sm", variant: "secondary" })}
          >
            View my results
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your reviews to complete</CardTitle>
        </CardHeader>
        <CardContent>
          {!myAssignments?.length ? (
            <p className="text-sm text-muted-foreground">
              You have no assignments in this cycle.
            </p>
          ) : (
            <ul className="space-y-2">
              {myAssignments.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/o/${orgSlug}/cycles/${cycleId}/review/${a.id}`}
                    className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
                  >
                    <span className="capitalize">
                      {a.relationship_type.replace("_", " ")} review
                    </span>
                    <Badge variant={a.status === "submitted" ? "secondary" : "outline"}>
                      {a.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AssignmentForm
              orgSlug={orgSlug}
              orgId={org.id}
              cycleId={cycleId}
              members={(members as OrgMember[]) || []}
            />
            <ul className="space-y-1 text-sm">
              {(adminAssignments.data as unknown as AssignmentRow[] | null)?.map(
                (a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between border-b py-2 last:border-none"
                  >
                    <span>
                      {a.reviewer?.display_name ?? "External"} →{" "}
                      {a.reviewee?.display_name} ({a.relationship_type})
                    </span>
                    <Badge variant={a.status === "submitted" ? "secondary" : "outline"}>
                      {a.status}
                    </Badge>
                  </li>
                ),
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
