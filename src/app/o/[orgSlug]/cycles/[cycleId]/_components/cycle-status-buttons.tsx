"use client";

import { useTransition } from "react";
import { setCycleStatus } from "../actions";
import { Button } from "@/components/ui/button";
import type { CycleStatus } from "@/lib/types";

export function CycleStatusButtons({
  orgSlug,
  cycleId,
  status,
}: {
  orgSlug: string;
  cycleId: string;
  status: CycleStatus;
}) {
  const [pending, startTransition] = useTransition();

  function change(next: CycleStatus) {
    startTransition(() => {
      setCycleStatus(orgSlug, cycleId, next);
    });
  }

  return (
    <div className="flex gap-2">
      {status === "draft" && (
        <Button size="sm" disabled={pending} onClick={() => change("active")}>
          Activate cycle
        </Button>
      )}
      {status === "active" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => change("closed")}
        >
          Close cycle
        </Button>
      )}
    </div>
  );
}
