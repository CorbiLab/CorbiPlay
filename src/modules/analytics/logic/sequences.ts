import type { EventType, HockeyEvent, Possession } from "@/types/database";
import { getPitchZone, type AttackingDirection } from "@/modules/live-encoding/logic/pitch-zones";

/**
 * Sequence/possession analytics (docs/HOCKEY_ANALYTICS.md). Everything here
 * is a pure function over already-fetched events/possessions — nothing is
 * stored, nothing runs during live encoding, and none of it requires
 * `hockey_events.possession_id` to actually be populated yet: a possession's
 * events are found by time window + team, which is the "equivalent sequence
 * identity" the schema note calls out, and keeps this usable the moment a
 * write path starts inserting possession rows, without waiting on that path
 * to also backfill the FK on every event.
 */

/**
 * Every non-deleted event that falls within a possession's time window, for
 * its side, in order. Matches on `is_opponent` as well as `team_id` — team_id
 * is always OUR team (spec §16), so an opponent possession and one of ours
 * share the same team_id and would otherwise pull each other's events into
 * the same sequence.
 */
export function getPossessionEvents(possession: Possession, events: HockeyEvent[]): HockeyEvent[] {
  const end = possession.end_match_elapsed_ms ?? Infinity;
  return events
    .filter(
      (e) =>
        !e.deleted_at &&
        e.team_id === possession.team_id &&
        e.is_opponent === possession.is_opponent &&
        e.match_elapsed_ms >= possession.start_match_elapsed_ms &&
        e.match_elapsed_ms <= end
    )
    .sort((a, b) => a.match_elapsed_ms - b.match_elapsed_ms);
}

/** Null while the possession hasn't been closed (no end_match_elapsed_ms yet). */
export function getSequenceDurationMs(possession: Possession): number | null {
  if (possession.end_match_elapsed_ms == null) return null;
  return possession.end_match_elapsed_ms - possession.start_match_elapsed_ms;
}

export function sequenceReachedEventType(possession: Possession, events: HockeyEvent[], type: EventType): boolean {
  return getPossessionEvents(possession, events).some((e) => e.event_type === type);
}

export const didSequenceReachEntry25 = (p: Possession, events: HockeyEvent[]) => sequenceReachedEventType(p, events, "ENTRY_25");
export const didSequenceReachCircle = (p: Possession, events: HockeyEvent[]) => sequenceReachedEventType(p, events, "CIRCLE_ENTRY");
export const didSequenceGenerateShot = (p: Possession, events: HockeyEvent[]) => sequenceReachedEventType(p, events, "SHOT");
export const didSequenceGenerateChance = (p: Possession, events: HockeyEvent[]) => sequenceReachedEventType(p, events, "CHANCE");
export const didSequenceGenerateGoal = (p: Possession, events: HockeyEvent[]) => sequenceReachedEventType(p, events, "GOAL");

/** ms from the possession's first event to the first occurrence of `type`, or null if it never occurs. */
export function timeToFirstEventType(possession: Possession, events: HockeyEvent[], type: EventType): number | null {
  const sequence = getPossessionEvents(possession, events);
  if (sequence.length === 0) return null;
  const target = sequence.find((e) => e.event_type === type);
  if (!target) return null;
  return target.match_elapsed_ms - sequence[0].match_elapsed_ms;
}

/**
 * A BALL_WIN recovered in the attacking half (spec §17) — "high" is relative
 * to the winning team's attacking direction, never a raw x coordinate.
 */
export function isHighBallWin(event: HockeyEvent, attackingDirection: AttackingDirection): boolean {
  if (event.event_type !== "BALL_WIN" || event.start_x == null || event.start_y == null) return false;
  const zone = getPitchZone(event.start_x, event.start_y, attackingDirection);
  return zone.startsWith("ATTACKING_25") || zone === "CIRCLE";
}

/** A TURNOVER conceded in one's own defensive 25 (spec §18). */
export function isDefensiveTurnover(event: HockeyEvent, attackingDirection: AttackingDirection): boolean {
  if (event.event_type !== "TURNOVER" || event.start_x == null || event.start_y == null) return false;
  return getPitchZone(event.start_x, event.start_y, attackingDirection).startsWith("DEFENSIVE_25");
}

export interface ConversionFunnelStage {
  eventType: EventType;
  label: string;
  count: number;
  /** % of the stage immediately before this one (null for the first stage). */
  pctOfPrevious: number | null;
  /** % of the total possession count. */
  pctOfPossessions: number | null;
}

export interface ConversionFunnel {
  possessionCount: number;
  stages: ConversionFunnelStage[];
}

const DEFAULT_FUNNEL_STAGES: { type: EventType; label: string }[] = [
  { type: "ENTRY_25", label: "Entry 25" },
  { type: "CIRCLE_ENTRY", label: "Circle Entry" },
  { type: "SHOT", label: "Shot" },
  { type: "CHANCE", label: "Chance" },
  { type: "GOAL", label: "Goal" },
];

/**
 * The default POSSESSION → ENTRY_25 → CIRCLE_ENTRY → SHOT → CHANCE → GOAL
 * funnel (spec §15), with counts/percentages computed from possessions and
 * their events — never hand-maintained. `stages` can be overridden so the
 * same function serves a custom team game model later without changing its
 * shape.
 */
export function computeConversionFunnel(
  possessions: Possession[],
  events: HockeyEvent[],
  stageDefs: { type: EventType; label: string }[] = DEFAULT_FUNNEL_STAGES
): ConversionFunnel {
  const possessionCount = possessions.length;
  let previousCount = possessionCount;

  const stages: ConversionFunnelStage[] = stageDefs.map(({ type, label }) => {
    const count = possessions.filter((p) => sequenceReachedEventType(p, events, type)).length;
    const stage: ConversionFunnelStage = {
      eventType: type,
      label,
      count,
      pctOfPrevious: previousCount > 0 ? (count / previousCount) * 100 : null,
      pctOfPossessions: possessionCount > 0 ? (count / possessionCount) * 100 : null,
    };
    previousCount = count;
    return stage;
  });

  return { possessionCount, stages };
}
