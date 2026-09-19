"use client";

import { PitchMarkings, PITCH_HEIGHT_UNITS } from "@/components/pitch/hockey-pitch";
import { computeZoneCounts } from "@/modules/analytics/logic/pitch-heatmap";
import type { HockeyEvent } from "@/types/database";

/**
 * Each of the 12 live-encoding zones (TAP_ZONES) shaded by how many events
 * landed in it — a scatter of same-opacity dots doesn't read as "where did
 * this happen" with only a handful of events in a match; a shaded cell with
 * its count printed on it does, at a glance.
 */
export function EventHeatmap({ events }: { events: HockeyEvent[] }) {
  const zones = computeZoneCounts(events);
  const maxCount = Math.max(1, ...zones.map((z) => z.count));

  return (
    <svg viewBox={`0 0 100 ${PITCH_HEIGHT_UNITS}`} className="w-full rounded-md" role="img" aria-label="Carte de chaleur des événements sur le terrain, par zone">
      <PitchMarkings heightUnits={PITCH_HEIGHT_UNITS} />
      {zones.map((zone) => {
        const [x0, x1] = zone.xRange;
        const [y0raw, y1raw] = zone.yRange;
        const y0 = (y0raw / 100) * PITCH_HEIGHT_UNITS;
        const y1 = (y1raw / 100) * PITCH_HEIGHT_UNITS;
        const intensity = zone.count === 0 ? 0 : 0.18 + 0.62 * (zone.count / maxCount);
        return (
          <g key={zone.zoneId}>
            <rect
              x={x0 + 0.3}
              y={y0 + 0.3}
              width={x1 - x0 - 0.6}
              height={y1 - y0 - 0.6}
              rx={1}
              fill="var(--primary)"
              fillOpacity={intensity}
              stroke="#dfe8e2"
              strokeOpacity={0.35}
              strokeWidth={0.25}
            />
            {zone.count > 0 && (
              <text
                x={(x0 + x1) / 2}
                y={(y0 + y1) / 2 + 1}
                fontSize={3.4}
                fontWeight={700}
                fill={intensity > 0.45 ? "#ffffff" : "#dfe8e2"}
                textAnchor="middle"
              >
                {zone.count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
