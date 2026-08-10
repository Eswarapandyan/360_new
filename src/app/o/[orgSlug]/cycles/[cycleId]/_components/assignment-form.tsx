"use client";

import { useActionState } from "react";
import { createAssignment, type AssignmentState } from "../actions";
import { Button } from "@/components/ui/button";
import type { OrgMember } from "@/lib/types";

const initialState: AssignmentState = { error: null };

export function AssignmentForm({
  orgSlug,
  orgId,
  cycleId,
  members,
}: {
  orgSlug: string;
  orgId: string;
  cycleId: string;
  members: OrgMember[];
}) {
  const boundAction = createAssignment.bind(null, orgSlug, orgId, cycleId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <select
        name="reviewee_id"
        required
        defaultValue=""
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
      >
        <option value="" disabled>
          Reviewee
        </option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.display_name}
          </option>
        ))}
      </select>
      <select
        name="reviewer_id"
        required
        defaultValue=""
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
      >
        <option value="" disabled>
          Reviewer
        </option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.display_name}
          </option>
        ))}
      </select>
      <select
        name="relationship_type"
        required
        defaultValue=""
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
      >
        <option value="" disabled>
          Relationship
        </option>
        <option value="self">Self</option>
        <option value="manager">Manager</option>
        <option value="peer">Peer</option>
        <option value="direct_report">Direct report</option>
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding..." : "Add assignment"}
      </Button>
      {state.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
