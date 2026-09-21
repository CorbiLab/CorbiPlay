"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeasonMatchResult } from "@/modules/analytics/logic/season-summary";

const RESULT_COLOR: Record<SeasonMatchResult["result"], string> = {
  WIN: "var(--category-possession)",
  DRAW: "var(--muted-foreground)",
  LOSS: "var(--category-danger)",
};

/** Goal margin (our score - opponent's) per finished match, chronological — a quick "form" read at a glance. */
export function SeasonTrendChart({ matchResults }: { matchResults: SeasonMatchResult[] }) {
  const data = matchResults.map((r) => ({
    label: r.opponentName,
    margin: r.ourScore - r.opponentScore,
    score: `${r.ourScore}–${r.opponentScore}`,
    result: r.result,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} interval={0} angle={-30} textAnchor="end" height={60} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} width={32} allowDecimals={false} />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="2 2" />
        <Tooltip
          formatter={(_value, _name, props) => [props.payload.score, "Score"] as [string, string]}
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
        />
        <Bar dataKey="margin" radius={[4, 4, 4, 4]}>
          {data.map((d, i) => (
            <Cell key={i} fill={RESULT_COLOR[d.result]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
