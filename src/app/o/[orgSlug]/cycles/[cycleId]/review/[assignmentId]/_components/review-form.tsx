"use client";

import { useActionState } from "react";
import { submitReview, type SubmitReviewState } from "../actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface QuestionWithCompetency {
  id: string;
  text: string;
  question_type: "rating_1_5" | "rating_1_7" | "text";
  sort_order: number;
  competencies: { name: string } | null;
}

interface ExistingResponse {
  question_id: string;
  rating_value: number | null;
  text_value: string | null;
}

const initialState: SubmitReviewState = { error: null };

export function ReviewForm({
  orgSlug,
  cycleId,
  assignmentId,
  questions,
  existingResponses,
  alreadySubmitted,
}: {
  orgSlug: string;
  cycleId: string;
  assignmentId: string;
  questions: QuestionWithCompetency[];
  existingResponses: ExistingResponse[];
  alreadySubmitted: boolean;
}) {
  const boundAction = submitReview.bind(
    null,
    orgSlug,
    cycleId,
    assignmentId,
    questions.map((q) => q.id),
  );
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  const existingByQuestion = new Map(
    existingResponses.map((r) => [r.question_id, r]),
  );

  return (
    <form action={formAction} className="space-y-4">
      {questions.map((q) => {
        const existing = existingByQuestion.get(q.id);
        const scale = q.question_type === "rating_1_7" ? 7 : 5;

        return (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-base">{q.text}</CardTitle>
              {q.competencies?.name && (
                <p className="text-xs text-muted-foreground">
                  {q.competencies.name}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {q.question_type === "text" ? (
                <Textarea
                  name={`text_${q.id}`}
                  defaultValue={existing?.text_value ?? ""}
                  placeholder="Your feedback..."
                  rows={4}
                />
              ) : (
                <div className="flex gap-4">
                  {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
                    <Label
                      key={n}
                      className="flex flex-col items-center gap-1 text-sm"
                    >
                      <input
                        type="radio"
                        name={`rating_${q.id}`}
                        value={n}
                        defaultChecked={existing?.rating_value === n}
                        required
                      />
                      {n}
                    </Label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? "Submitting..."
          : alreadySubmitted
            ? "Update submission"
            : "Submit review"}
      </Button>
    </form>
  );
}
