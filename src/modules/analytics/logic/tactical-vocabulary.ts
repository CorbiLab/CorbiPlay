/**
 * Suggested tactical vocabulary (docs/HOCKEY_ANALYTICS.md). These are
 * defaults for a picker UI, never an enforced/exhaustive set — the columns
 * they back (`possessions.possession_start_type` / `.attack_type` /
 * `.tactical_context` / `.outcome`, `hockey_events.pressure_context`) are
 * plain `text` precisely so a club can use its own labels instead (ADR-002
 * in docs/ARCHITECTURE.md). Nothing reads these lists yet — no live-encoding
 * screen or post-match review UI exists in Sprint 1.
 */

export const SUGGESTED_POSSESSION_START_TYPES = [
  "BALL_RECOVERY",
  "FREE_HIT",
  "SIDELINE_BALL",
  "LONG_CORNER",
  "DEFENSIVE_RESTART",
  "CENTER_PASS",
  "OPPONENT_TURNOVER",
  "INTERCEPTION",
  "GOALKEEPER_RESTART",
  "OTHER",
] as const;

export const SUGGESTED_ATTACK_TYPES = ["ESTABLISHED_ATTACK", "COUNTER_ATTACK", "SET_PIECE", "OTHER"] as const;

export const SUGGESTED_TACTICAL_CONTEXTS = [
  "OUTLET",
  "TRANSFER",
  "BUILD_UP",
  "HIGH_PRESS",
  "THREE_QUARTER_PRESS",
  "HALF_PRESS",
  "LOW_BLOCK",
  "COUNTER_PRESS",
  "COUNTER_ATTACK",
  "ESTABLISHED_ATTACK",
  "SET_PIECE",
  "OVERLOAD",
  "OTHER",
] as const;

/** Sequence-level outcome — distinct from HockeyEvent.outcome (SUCCESS/FAIL/NEUTRAL), which is per-event. */
export const SUGGESTED_SEQUENCE_OUTCOMES = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

export const SUGGESTED_PRESSURE_CONTEXTS = ["NO_PRESSURE", "LOW_PRESSURE", "MEDIUM_PRESSURE", "HIGH_PRESSURE"] as const;

/**
 * PRESS (team defensive organisation/action) and PRESSURE (§ above, how much
 * pressure the ball carrier feels) are deliberately separate concepts — see
 * ADR-003. Press outcomes live in `hockey_events.metadata.pressOutcome`
 * (not a column: same reasoning as the rest of this file), never squeezed
 * into the generic 3-value `event_outcome` enum, which would lose the
 * distinction between e.g. FORCED_BACKWARD and FORCED_LONG_BALL.
 */
export const SUGGESTED_PRESS_TYPES = [
  "FULL_PRESS",
  "HIGH_PRESS",
  "THREE_QUARTER_PRESS",
  "HALF_PRESS",
  "LOW_BLOCK",
  "COUNTER_PRESS",
  "NO_PRESS",
  "OTHER",
] as const;

export const SUGGESTED_PRESS_OUTCOMES = ["BALL_WIN", "FORCED_BACKWARD", "FORCED_LONG_BALL", "BROKEN", "NO_EFFECT"] as const;

export const SUGGESTED_PRESS_PARTICIPANT_ROLES = ["PRESSER", "PRESS_SUPPORT"] as const;
