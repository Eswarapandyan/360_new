"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface RadarDatum {
  competency: string;
  self: number | null;
  manager: number | null;
  peer: number | null;
  direct_report: number | null;
}

const SERIES: { key: keyof Omit<RadarDatum, "competency">; label: string; color: string }[] = [
  { key: "self", label: "Self", color: "#6366f1" },
  { key: "manager", label: "Manager", color: "#059669" },
  { key: "peer", label: "Peers", color: "#d97706" },
  { key: "direct_report", label: "Direct reports", color: "#dc2626" },
];

export function ResultsRadarChart({ data }: { data: RadarDatum[] }) {
  const hasAnyData = data.some((d) =>
    SERIES.some((s) => d[s.key] !== null),
  );

  if (!hasAnyData) {
    return (
      <p className="text-sm text-muted-foreground">
        No results yet -- results appear here once reviewers submit.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid />
        <PolarAngleAxis dataKey="competency" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 5]} />
        {SERIES.map((s) => (
          <Radar
            key={s.key}
            name={s.label}
            dataKey={s.key}
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.15}
            connectNulls
          />
        ))}
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
