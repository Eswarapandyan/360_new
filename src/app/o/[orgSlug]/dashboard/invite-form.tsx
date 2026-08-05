"use client";

import { useActionState } from "react";
import { inviteMember, type InviteState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: InviteState = { error: null, success: null };

export function InviteForm({
  orgSlug,
  orgId,
  orgName,
}: {
  orgSlug: string;
  orgId: string;
  orgName: string;
}) {
  const boundAction = inviteMember.bind(null, orgSlug, orgId, orgName);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[200px]">
        <Input
          name="email"
          type="email"
          placeholder="colleague@company.com"
          required
        />
      </div>
      <select
        name="role"
        defaultValue="employee"
        className="h-9 w-[130px] rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
      >
        <option value="employee">Employee</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>
      <Button type="submit" disabled={pending}>
        {pending ? "Inviting..." : "Invite"}
      </Button>
      {state.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="w-full text-sm text-muted-foreground">
          {state.success}
        </p>
      )}
    </form>
  );
}
