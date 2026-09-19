import type { HockeyEvent } from "@/types/database";
import { TAP_ZONES } from "@/modules/live-encoding/logic/pitch-zones";

export interface ZoneCount {
  zoneId: string;
  xRange: [number, number];
  yRange: [number, number];
  count: number;
}

/**
 * Buckets events into the same 12 geometric cells the live-encoding pitch
 * taps into (TAP_ZONES) — not getPitchZone's DEFENSIVE_25/ATTACKING_25
 * naming, which needs a real attacking direction per quarter that nothing
 * populates yet (`matches.attacking_directions`, see HOCKEY_ANALYTICS.md
 * "Spatial analytics"). A cell shaded by how many events landed in it reads
 * at a glance; a scatter of same-opacity dots doesn't, especially with only
 * a handful of events in a match.
 *
 * Every real tap already lands exactly on a TAP_ZONES centre point (see
 * zone-pitch.tsx's handleTap), so `<=` on both bounds never double-counts
 * in practice — it's just the safe way to write an edge case that shouldn't
 * occur rather than one that silently drops a point sitting on a boundary.
 */
export function computeZoneCounts(events: HockeyEvent[]): ZoneCount[] {
  // Same is_opponent exclusion as computeMatchStats — a heatmap of "our"
  // activity must never include the opponent's positions (ADR-004).
  const positioned = events.filter((e) => !e.deleted_at && !e.is_opponent && e.start_x != null && e.start_y != null);

  return TAP_ZONES.map((zone) => ({
    zoneId: zone.id,
    xRange: zone.xRange,
    yRange: zone.yRange,
    count: positioned.filter(
      (e) =>
        e.start_x! >= zone.xRange[0] &&
        e.start_x! <= zone.xRange[1] &&
        e.start_y! >= zone.yRange[0] &&
        e.start_y! <= zone.yRange[1]
    ).length,
  }));
}
