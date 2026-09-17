import type { EventType, HockeyEvent } from "@/types/database";

/**
 * A genuine two-team swing: our events add to the score, the opponent's
 * subtract from it (same weight table, opposite sign — `is_opponent` is
 * what makes this possible; before it shipped, momentum could only sum our
 * own events). Positive = we're on top; negative = they are.
 *
 * Weights are a typed constant, not DB-editable (ROADMAP.md issue #2 already
 * flags this same open question for the match-reference formula — no UI to
 * edit either exists yet).
 */
const EVENT_WEIGHT: Partial<Record<EventType, number>> = {
  GOAL: 10,
  PC_GOAL: 8,
  CHANCE: 5,
  SHOT: 3,
  CIRCLE_ENTRY: 2,
  ENTRY_25: 1,
  PC_WON: 2,
  BALL_WIN: 1,
  INTERCEPTION: 1,
  TACKLE: 1,
  TURNOVER: -1,
  FOUL: -1,
  GREEN_CARD: -1,
  YELLOW_CARD: -3,
  RED_CARD: -5,
};

export interface MomentumPoint {
  matchElapsedMs: number;
  score: number;
}

/**
 * One point every `stepMs`, each the sum of event weights within the
 * trailing `windowMs` window ending at that point — a smooth rolling curve
 * rather than a per-event spike train. `matchDurationMs` bounds how far the
 * curve extends past the last event (e.g. to the end of a finished match).
 */
export function computeMomentum(
  events: HockeyEvent[],
  matchDurationMs: number,
  windowMs = 5 * 60_000,
  stepMs = 60_000
): MomentumPoint[] {
  const live = events.filter((e) => !e.deleted_at && EVENT_WEIGHT[e.event_type] !== undefined);
  if (matchDurationMs <= 0) return [];

  const points: MomentumPoint[] = [];
  for (let t = 0; t <= matchDurationMs; t += stepMs) {
    const windowStart = t - windowMs;
    let score = 0;
    for (const event of live) {
      if (event.match_elapsed_ms > windowStart && event.match_elapsed_ms <= t) {
        const weight = EVENT_WEIGHT[event.event_type] ?? 0;
        score += event.is_opponent ? -weight : weight;
      }
    }
    points.push({ matchElapsedMs: t, score });
  }
  return points;
}
