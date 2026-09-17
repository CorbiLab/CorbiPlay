"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function EventCountChart({ data, fill = "var(--category-progression)" }: { data: { type: string; count: number }[]; fill?: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis type="category" dataKey="type" width={100} stroke="var(--muted-foreground)" fontSize={12} />
        <Bar dataKey="count" fill={fill} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
