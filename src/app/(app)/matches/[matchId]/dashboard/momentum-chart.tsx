"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatClock } from "@/modules/matches/logic/clock";
import type { MomentumPoint } from "@/modules/analytics/logic/momentum";

export function MomentumChart({ points }: { points: MomentumPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={points} margin={{ left: 8, right: 8 }}>
        <defs>
          <linearGradient id="momentumFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="matchElapsedMs"
          tickFormatter={(ms: number) => formatClock(ms)}
          stroke="var(--muted-foreground)"
          fontSize={12}
          minTickGap={40}
        />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} width={32} />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="2 2" />
        <Tooltip
          labelFormatter={(label) => formatClock(Number(label))}
          formatter={(value) => [String(value), "Momentum"] as [string, string]}
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
        />
        <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} fill="url(#momentumFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
