import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/org";
import type { CompetencyResult } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResultsRadarChart, type RadarDatum } from "./results-radar-chart";

const BUCKETS: {
  key: "self" | "manager" | "peer" | "direct_report";
  label: string;
}[] = [
  { key: "self", label: "Self" },
  { key: "manager", label: "Manager" },
  { key: "peer", label: "Peers (anonymous)" },
  { key: "direct_report", label: "Direct reports (anonymous)" },
];

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; cycleId: string }>;
}) {
  const { orgSlug, cycleId } = await params;
  const supabase = await createClient();
  await requireOrgMember(supabase, orgSlug);

  const { data, error } = await supabase.rpc("get_my_results", {
    p_cycle_id: cycleId,
  });

  const results = (data as CompetencyResult[] | null) || [];

  const chartData: RadarDatum[] = results.map((r) => ({
    competency: r.competency_name,
    self: r.self?.avg_rating ?? null,
    manager: r.manager?.avg_rating ?? null,
    peer: r.peer && !r.peer.locked ? r.peer.avg_rating : null,
    direct_report:
      r.direct_report && !r.direct_report.locked
        ? r.direct_report.avg_rating
        : null,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Your results</h1>

      {error && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResultsRadarChart data={chartData} />
        </CardContent>
      </Card>

      {results.map((r) => (
        <Card key={r.competency_id}>
          <CardHeader>
            <CardTitle className="text-base">{r.competency_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {BUCKETS.map(({ key, label }) => {
              const bucket = r[key];
              if (!bucket) return null;

              return (
                <div key={key}>
                  <p className="text-sm font-medium">{label}</p>
                  {bucket.locked ? (
                    <p className="text-sm text-muted-foreground">
                      Not enough responses yet -- results appear once enough
                      peers have submitted.
                    </p>
                  ) : (
                    <>
                      {bucket.avg_rating !== null && (
                        <p className="text-sm text-muted-foreground">
                          Average rating: {bucket.avg_rating.toFixed(1)}
                        </p>
                      )}
                      {bucket.comments?.length > 0 && (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                          {bucket.comments.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
