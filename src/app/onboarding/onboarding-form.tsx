"use client";

import { useActionState } from "react";
import { createOrganization, type CreateOrgState } from "./actions";
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

const initialState: CreateOrgState = { error: null };

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createOrganization,
    initialState,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>
          You&apos;ll be the first admin. You can invite your team next.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Acme Inc."
              required
              autoFocus
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Create organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
