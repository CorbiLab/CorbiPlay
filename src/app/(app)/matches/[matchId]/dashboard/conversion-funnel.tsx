import { getEventDefinition } from "@/modules/live-encoding/event-definitions";
import type { ConversionFunnel } from "@/modules/analytics/logic/sequences";
import type { EventType } from "@/types/database";

/**
 * Plain HTML/CSS, not a charting library — each stage is a bar sized against
 * the total possession count, with its own count/percentages as text. A
 * Recharts FunnelChart doesn't leave room for two percentages per stage
 * (of the previous stage, of the total) without fighting its label layout.
 */
export function ConversionFunnelView({
  funnel,
  emptyMessage = "Aucune possession matérialisée pour l'instant — tague Possession Start / Possession End en direct pour alimenter l'entonnoir.",
  barClassName = "bg-primary text-primary-foreground",
}: {
  funnel: ConversionFunnel;
  emptyMessage?: string;
  barClassName?: string;
}) {
  if (funnel.possessionCount === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const stages: { eventType: EventType | null; label: string; count: number; pctOfPrevious: number | null; pctOfPossessions: number | null }[] = [
    { eventType: null, label: "Possessions", count: funnel.possessionCount, pctOfPrevious: null, pctOfPossessions: 100 },
    ...funnel.stages,
  ];

  return (
    <div className="space-y-2">
      {stages.map((stage, i) => {
        const label = stage.eventType ? getEventDefinition(stage.eventType).label : stage.label;
        const widthPct = Math.max(stage.pctOfPossessions ?? 0, stage.count > 0 ? 4 : 0);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-sm font-medium">{label}</span>
            <div className="h-7 min-w-0 flex-1 rounded-md bg-muted">
              <div
                className={`flex h-full items-center justify-end rounded-md px-2 text-xs font-semibold transition-all ${barClassName}`}
                style={{ width: `${widthPct}%` }}
              >
                {stage.count}
              </div>
            </div>
            <span className="w-28 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
              {stage.pctOfPossessions != null ? `${stage.pctOfPossessions.toFixed(0)}%` : "—"}
              {stage.pctOfPrevious != null && i > 1 ? ` (${stage.pctOfPrevious.toFixed(0)}% préc.)` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
