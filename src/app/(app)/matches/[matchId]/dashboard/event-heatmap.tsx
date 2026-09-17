"use client";

import { PitchMarkings, PITCH_HEIGHT_UNITS } from "@/components/pitch/hockey-pitch";
import { CATEGORY_COLOR_VAR } from "@/modules/live-encoding/category-colors";
import { getEventDefinition } from "@/modules/live-encoding/event-definitions";
import type { HockeyEvent } from "@/types/database";

/**
 * A density heatmap without a kernel-density library: each event is a small
 * semi-transparent dot, coloured by its category — overlapping taps read as
 * "hot zones" through simple alpha stacking, which is enough resolution for
 * a single match's worth of events.
 */
export function EventHeatmap({ events }: { events: HockeyEvent[] }) {
  const points = events.filter((e) => !e.deleted_at && e.start_x != null && e.start_y != null);

  return (
    <svg viewBox={`0 0 100 ${PITCH_HEIGHT_UNITS}`} className="w-full rounded-md" role="img" aria-label="Carte de chaleur des événements sur le terrain">
      <PitchMarkings heightUnits={PITCH_HEIGHT_UNITS} />
      {points.map((event) => (
        <circle
          key={event.id}
          cx={event.start_x!}
          cy={(event.start_y! / 100) * PITCH_HEIGHT_UNITS}
          r={1.6}
          fill={CATEGORY_COLOR_VAR[getEventDefinition(event.event_type).category]}
          fillOpacity={0.35}
        />
      ))}
    </svg>
  );
}
