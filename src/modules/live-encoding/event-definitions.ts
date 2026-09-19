import type { EventCategory, EventOutcome, EventType } from "@/types/database";
import { SUGGESTED_PRESS_PARTICIPANT_ROLES } from "@/modules/analytics/logic/tactical-vocabulary";

/**
 * Configurable event behaviour (spec §25, extended by the encoding-levels
 * update — see ADR-003 in ARCHITECTURE.md) — kept as typed code constants
 * for Sprint 1 rather than a DB table. See docs/ROADMAP.md item 2: nothing
 * needs this to be end-user-editable yet, and moving it to a DB-backed
 * config table later is additive (read the same shape from an
 * `event_definitions` table instead of this constant), not a redesign.
 */
export type EncodingLevel = "BASIC" | "STANDARD" | "ADVANCED" | "CUSTOM";

/**
 * Never blocks a save except REQUIRED — and REQUIRED only exists for
 * PLAYER_IN/PLAYER_OUT, where the player *is* the event (there's no
 * team-level fallback for "someone substituted"; player_stints/on-field
 * tracking would silently corrupt without it). Every other event type tops
 * out at RECOMMENDED, per the update's central rule: player attribution is
 * never mandatory to save, only ever nudged.
 */
export type RequirementLevel = "OPTIONAL" | "RECOMMENDED" | "REQUIRED";

export type ParticipantSelectionMode = "NONE" | "SINGLE" | "MULTIPLE";

export interface EventDefinition {
  type: EventType;
  label: string;
  category: EventCategory;
  /** The STANDARD/ADVANCED baseline — resolvePlayerRequirement() relaxes this for BASIC. */
  playerRequirement: RequirementLevel;
  participantSelectionMode: ParticipantSelectionMode;
  /** Only meaningful when participantSelectionMode is MULTIPLE — suggested roles for the players tapped, in tap order. */
  participantRoles?: readonly string[];
  positionRequired: boolean;
  endPositionRequired: boolean;
  outcomeRequired: boolean;
  /** What each generic outcome value means for THIS event type, for button labels. */
  outcomeLabels?: Partial<Record<EventOutcome, string>>;
  secondaryPlayerRole?: string | null;
  /** True if tagging this event type should increment the team's score. */
  scoring?: boolean;
}

export const EVENT_DEFINITIONS: Record<EventType, EventDefinition> = {
  POSSESSION_START: { type: "POSSESSION_START", label: "Possession Start", category: "POSSESSION", playerRequirement: "OPTIONAL", participantSelectionMode: "NONE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },
  POSSESSION_END: { type: "POSSESSION_END", label: "Possession End", category: "POSSESSION", playerRequirement: "OPTIONAL", participantSelectionMode: "NONE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },

  BALL_WIN: { type: "BALL_WIN", label: "Ball Win", category: "TRANSITION", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },
  TURNOVER: { type: "TURNOVER", label: "Lose Ball", category: "TRANSITION", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },
  COUNTER_ATTACK: { type: "COUNTER_ATTACK", label: "Counter Attack", category: "TRANSITION", playerRequirement: "OPTIONAL", participantSelectionMode: "NONE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },

  DEFENSIVE_EXIT: { type: "DEFENSIVE_EXIT", label: "Defensive Exit", category: "PROGRESSION", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: true, outcomeLabels: { SUCCESS: "Clean", FAIL: "Lost" } },
  TRANSFER: { type: "TRANSFER", label: "Transfer", category: "PROGRESSION", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: true, outcomeRequired: true, outcomeLabels: { SUCCESS: "Complete", FAIL: "Intercepted" } },
  AERIAL: { type: "AERIAL", label: "Aerial", category: "PROGRESSION", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: true, outcomeRequired: true, outcomeLabels: { SUCCESS: "Controlled", FAIL: "Lost" } },
  ENTRY_25: { type: "ENTRY_25", label: "Entry 25", category: "PROGRESSION", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },
  CIRCLE_ENTRY: { type: "CIRCLE_ENTRY", label: "Circle Entry", category: "PROGRESSION", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },
  KEY_PASS: { type: "KEY_PASS", label: "Key Pass", category: "PROGRESSION", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: true, outcomeRequired: false, secondaryPlayerRole: "RECEIVER" },

  SHOT: { type: "SHOT", label: "Shot", category: "ATTACK", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: true, outcomeLabels: { SUCCESS: "On Target", FAIL: "Off Target", NEUTRAL: "Blocked" } },
  CHANCE: { type: "CHANCE", label: "Chance", category: "ATTACK", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: true, outcomeLabels: { SUCCESS: "Scored", FAIL: "Missed", NEUTRAL: "Saved" } },
  GOAL: { type: "GOAL", label: "Goal", category: "ATTACK", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: false, secondaryPlayerRole: "ASSIST", scoring: true },
  ASSIST: { type: "ASSIST", label: "Assist", category: "ATTACK", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: false, endPositionRequired: false, outcomeRequired: false },

  PRESS: {
    type: "PRESS",
    label: "Press",
    category: "PRESS",
    playerRequirement: "OPTIONAL",
    participantSelectionMode: "MULTIPLE",
    participantRoles: SUGGESTED_PRESS_PARTICIPANT_ROLES,
    positionRequired: true,
    endPositionRequired: false,
    // Outcome is captured via metadata.pressOutcome (a richer 5-value set
    // than the generic 3-value event_outcome enum — see
    // tactical-vocabulary.ts) and is never a save-blocker: "PRESS -> pitch ->
    // saved" must work with zero players and no outcome in BASIC mode.
    outcomeRequired: false,
  },

  PC_WON: { type: "PC_WON", label: "PC Won", category: "PC", playerRequirement: "OPTIONAL", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },
  PC_PLAYED: { type: "PC_PLAYED", label: "PC Played", category: "PC", playerRequirement: "OPTIONAL", participantSelectionMode: "NONE", positionRequired: false, endPositionRequired: false, outcomeRequired: false },
  PC_SHOT: { type: "PC_SHOT", label: "PC Shot", category: "PC", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: true, outcomeLabels: { SUCCESS: "On Target", FAIL: "Off Target", NEUTRAL: "Blocked" } },
  PC_GOAL: { type: "PC_GOAL", label: "PC Goal", category: "PC", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: false, scoring: true },

  INTERCEPTION: { type: "INTERCEPTION", label: "Interception", category: "DEFENCE", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },
  TACKLE: { type: "TACKLE", label: "Tackle", category: "DEFENCE", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: true, outcomeLabels: { SUCCESS: "Won", FAIL: "Beaten" } },
  DEFLECTION: { type: "DEFLECTION", label: "Deflection", category: "DEFENCE", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },

  FOUL: { type: "FOUL", label: "Foul", category: "DISCIPLINE", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: true, endPositionRequired: false, outcomeRequired: false },
  GREEN_CARD: { type: "GREEN_CARD", label: "Green Card", category: "DISCIPLINE", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: false, endPositionRequired: false, outcomeRequired: false },
  YELLOW_CARD: { type: "YELLOW_CARD", label: "Yellow Card", category: "DISCIPLINE", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: false, endPositionRequired: false, outcomeRequired: false },
  RED_CARD: { type: "RED_CARD", label: "Red Card", category: "DISCIPLINE", playerRequirement: "RECOMMENDED", participantSelectionMode: "SINGLE", positionRequired: false, endPositionRequired: false, outcomeRequired: false },

  // Substitutions are the one place player attribution stays REQUIRED —
  // there is no team-level version of "someone came off," and
  // player_stints/on-field tracking depends on knowing exactly who.
  PLAYER_IN: { type: "PLAYER_IN", label: "Player In", category: "SUBSTITUTION", playerRequirement: "REQUIRED", participantSelectionMode: "SINGLE", positionRequired: false, endPositionRequired: false, outcomeRequired: false },
  PLAYER_OUT: { type: "PLAYER_OUT", label: "Player Out", category: "SUBSTITUTION", playerRequirement: "REQUIRED", participantSelectionMode: "SINGLE", positionRequired: false, endPositionRequired: false, outcomeRequired: false },
};

/**
 * BASIC always relaxes player attribution to OPTIONAL — except REQUIRED,
 * which is structural (substitutions) and never relaxed. STANDARD/ADVANCED
 * both use the definition's own baseline: the update's SHOT example
 * ("BASIC: optional, STANDARD: optional, ADVANCED: recommended") describes a
 * *display/emphasis* difference the UI is free to add, not a different save
 * gate — modelling three full independent levels per event type here would
 * be exactly the overengineering the spec warns against for a distinction
 * that never changes whether a save is allowed.
 */
export function resolvePlayerRequirement(def: EventDefinition, level: EncodingLevel): RequirementLevel {
  if (def.playerRequirement === "REQUIRED") return "REQUIRED";
  if (level === "BASIC") return "OPTIONAL";
  return def.playerRequirement;
}

/**
 * The event types surfaced as buttons on the live-encoding grid (spec §24/84
 * Sprint 1 MVP list, plus the cheap-to-include discipline/defence types that
 * share the same mechanism). POSSESSION_START/END are ordinary buttons like
 * any other — the store's saveDraft() special-cases them to materialize/close
 * a real `possessions` row and stamp `possession_id` on every event tagged
 * in between (ADR-003/HOCKEY_ANALYTICS.md's "live-tagged" mechanism). ASSIST,
 * PC_PLAYED, and the substitution types are handled by dedicated flows, not
 * generic buttons — see modules/live-encoding for the substitution UI and the
 * "ASSIST?" smart suggestion after a GOAL (spec §31), which sets
 * GOAL.secondary_player_id rather than creating a second event row.
 *
 * This is the full (ADVANCED) grid. BASIC/STANDARD are narrower slices of
 * the same list, not separate definitions — see LEVEL_BUTTON_TYPES.
 */
export const LIVE_ENCODING_BUTTON_GROUPS: { category: EventCategory; types: EventType[] }[] = [
  { category: "POSSESSION", types: ["POSSESSION_START", "POSSESSION_END"] },
  { category: "TRANSITION", types: ["BALL_WIN", "TURNOVER", "COUNTER_ATTACK"] },
  { category: "PROGRESSION", types: ["ENTRY_25", "CIRCLE_ENTRY", "DEFENSIVE_EXIT", "TRANSFER", "AERIAL", "KEY_PASS"] },
  { category: "ATTACK", types: ["SHOT", "CHANCE", "GOAL"] },
  { category: "PRESS", types: ["PRESS"] },
  { category: "PC", types: ["PC_WON", "PC_SHOT", "PC_GOAL"] },
  { category: "DEFENCE", types: ["INTERCEPTION", "TACKLE", "DEFLECTION"] },
  { category: "DISCIPLINE", types: ["FOUL", "GREEN_CARD", "YELLOW_CARD", "RED_CARD"] },
];

/**
 * Per-level allowlist restricting LIVE_ENCODING_BUTTON_GROUPS down to what
 * that level's grid actually shows. `null` means "no restriction" (every
 * type in LIVE_ENCODING_BUTTON_GROUPS). Before the encoding-levels rework
 * requested 2026-09-19, all three levels showed that same full grid — only
 * player-attribution strictness varied (resolvePlayerRequirement). STANDARD
 * keeps that original full grid unchanged; BASIC is the new, deliberately
 * trimmed-down set for a solo analyst who just wants scoreline/transitions/
 * cards. ADVANCED is currently identical to STANDARD (both `null`) — the
 * still-open item is a dedicated ADVANCED-only screen *layout*, not a wider
 * button set (see docs/ROADMAP.md). CUSTOM isn't a fixed preset — it has no
 * entry here, its allowlist is whatever the analyst picked for *this match*
 * (matches.custom_encoding_types), passed into getLiveEncodingButtonGroups.
 */
const LEVEL_BUTTON_TYPES: Record<"BASIC" | "STANDARD" | "ADVANCED", EventType[] | null> = {
  BASIC: ["BALL_WIN", "TURNOVER", "CIRCLE_ENTRY", "PC_WON", "GOAL", "GREEN_CARD", "YELLOW_CARD", "RED_CARD"],
  STANDARD: null,
  ADVANCED: null,
};

/**
 * The button groups to render for a given encoding level. `customTypes` is
 * only consulted for CUSTOM — a per-match analyst-picked allowlist, since
 * unlike the other three levels it has no fixed preset (see
 * LEVEL_BUTTON_TYPES). An empty/missing selection means "nothing configured
 * yet," not "show everything" — the screen should prompt the analyst to
 * configure it rather than silently falling back to the full grid.
 */
export function getLiveEncodingButtonGroups(
  level: EncodingLevel,
  customTypes: readonly EventType[] = []
): { category: EventCategory; types: EventType[] }[] {
  const allowlist = level === "CUSTOM" ? customTypes : LEVEL_BUTTON_TYPES[level];
  if (!allowlist) return LIVE_ENCODING_BUTTON_GROUPS;
  const allowed = new Set(allowlist);
  return LIVE_ENCODING_BUTTON_GROUPS.map((group) => ({ ...group, types: group.types.filter((t) => allowed.has(t)) })).filter(
    (group) => group.types.length > 0
  );
}

export function getEventDefinition(type: EventType): EventDefinition {
  return EVENT_DEFINITIONS[type];
}
