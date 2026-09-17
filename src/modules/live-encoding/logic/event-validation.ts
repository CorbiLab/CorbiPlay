import { getEventDefinition } from "@/modules/live-encoding/event-definitions";
import type { EventOutcome, EventType } from "@/types/database";

export interface DraftEvent {
  type: EventType;
  playerId?: string | null;
  secondaryPlayerId?: string | null;
  /** Only meaningful when the event's participantSelectionMode is MULTIPLE (e.g. PRESS). */
  participantIds?: string[];
  startX?: number | null;
  startY?: number | null;
  endX?: number | null;
  endY?: number | null;
  outcome?: EventOutcome | null;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  missing: Array<"player" | "position" | "endPosition" | "outcome">;
}

/**
 * Checks a draft event against its EventDefinition before it's allowed to
 * save — this is what lets the live encoding UI auto-save the moment enough
 * information exists (spec §29/§31) instead of always requiring an explicit
 * confirm tap.
 *
 * Player attribution only ever blocks a save for PLAYER_IN/PLAYER_OUT
 * (`playerRequirement: "REQUIRED"`, see event-definitions.ts) — every other
 * event type is RECOMMENDED at most, per the encoding-levels update: a
 * BASIC-coded match with zero player attribution is valid data, not
 * incomplete data (docs/HOCKEY_ANALYTICS.md).
 */
export function validateDraftEvent(draft: DraftEvent): ValidationResult {
  const def = getEventDefinition(draft.type);
  const missing: ValidationResult["missing"] = [];

  if (def.playerRequirement === "REQUIRED" && !draft.playerId) missing.push("player");
  if (def.positionRequired && (draft.startX == null || draft.startY == null)) missing.push("position");
  if (def.endPositionRequired && (draft.endX == null || draft.endY == null)) missing.push("endPosition");
  if (def.outcomeRequired && !draft.outcome) missing.push("outcome");

  return { valid: missing.length === 0, missing };
}

export function isReadyToAutoSave(draft: DraftEvent): boolean {
  return validateDraftEvent(draft).valid;
}
