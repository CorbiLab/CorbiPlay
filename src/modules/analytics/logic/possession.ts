import type { HockeyEvent } from "@/types/database";

/**
 * Pairs POSSESSION_START/POSSESSION_END events into possession intervals
 * (spec §32). Sprint 1 does not auto-infer possession — the spec explicitly
 * defers that ("Prepare for future automatic possession inference") — so
 * this only aggregates whatever POSSESSION_* events exist; with none tagged,
 * it correctly returns zero possessions rather than guessing.
 */

export interface PossessionInterval {
  teamId: string;
  /** team_id is always ours (spec §16) — this is the real "whose possession" flag. */
  isOpponent: boolean;
  quarter: number;
  startMatchElapsedMs: number;
  endMatchElapsedMs: number | null;
  durationMs: number | null;
}

export function computePossessions(events: HockeyEvent[]): PossessionInterval[] {
  const live = events
    .filter((e) => !e.deleted_at && (e.event_type === "POSSESSION_START" || e.event_type === "POSSESSION_END"))
    .sort((a, b) => a.match_elapsed_ms - b.match_elapsed_ms);

  // Keyed by team_id + is_opponent, not team_id alone: team_id is always OUR
  // team (no opponent entity exists), so an opponent POSSESSION_START on the
  // same team_id would otherwise collide with — and incorrectly close — our
  // own open possession.
  const openByKey = new Map<string, { quarter: number; start: number }>();
  const intervals: PossessionInterval[] = [];

  for (const event of live) {
    const key = `${event.team_id}::${event.is_opponent}`;
    if (event.event_type === "POSSESSION_START") {
      openByKey.set(key, { quarter: event.quarter, start: event.match_elapsed_ms });
    } else {
      const open = openByKey.get(key);
      if (open) {
        intervals.push({
          teamId: event.team_id,
          isOpponent: event.is_opponent,
          quarter: open.quarter,
          startMatchElapsedMs: open.start,
          endMatchElapsedMs: event.match_elapsed_ms,
          durationMs: event.match_elapsed_ms - open.start,
        });
        openByKey.delete(key);
      }
    }
  }

  return intervals;
}

/** Keyed by side ("us" / "opponent"), not team_id — team_id can't distinguish them (spec §16). */
export function possessionPercentageBySide(intervals: PossessionInterval[]): Map<"us" | "opponent", number> {
  let usTotal = 0;
  let opponentTotal = 0;

  for (const interval of intervals) {
    if (interval.durationMs == null) continue;
    if (interval.isOpponent) opponentTotal += interval.durationMs;
    else usTotal += interval.durationMs;
  }

  const grandTotal = usTotal + opponentTotal;
  const percentages = new Map<"us" | "opponent", number>();
  if (grandTotal === 0) return percentages;
  percentages.set("us", (usTotal / grandTotal) * 100);
  percentages.set("opponent", (opponentTotal / grandTotal) * 100);
  return percentages;
}
