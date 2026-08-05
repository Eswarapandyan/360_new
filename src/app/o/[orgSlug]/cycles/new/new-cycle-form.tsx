"use client";

import { useActionState } from "react";
import { createCycle, type CreateCycleState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: CreateCycleState = { error: null };

export function NewCycleForm({
  orgSlug,
  orgId,
}: {
  orgSlug: string;
  orgId: string;
}) {
  const boundAction = createCycle.bind(null, orgSlug, orgId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>New review cycle</CardTitle>
        <CardDescription>
          Uses your org&apos;s default questions (Communication,
          Collaboration, Ownership, Growth).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Cycle name</Label>
            <Input id="name" name="name" placeholder="Q1 2026 Review" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="threshold">
              Minimum peer/report responses before results unlock
            </Label>
            <Input
              id="threshold"
              name="min_responses_for_disclosure"
              type="number"
              min={1}
              defaultValue={3}
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Create cycle"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
