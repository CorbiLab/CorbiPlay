import { describe, expect, it } from "vitest";
import { isReadyToAutoSave, validateDraftEvent } from "./event-validation";

describe("validateDraftEvent", () => {
  it("BALL_WIN needs a position but never a player (playerRequirement is RECOMMENDED, not REQUIRED)", () => {
    expect(validateDraftEvent({ type: "BALL_WIN" }).missing).toEqual(["position"]);
    expect(validateDraftEvent({ type: "BALL_WIN", startX: 10, startY: 10 }).valid).toBe(true);
    expect(
      validateDraftEvent({ type: "BALL_WIN", playerId: "p1", startX: 10, startY: 10 }).valid
    ).toBe(true);
  });

  it("SHOT additionally requires an outcome", () => {
    const withoutOutcome = validateDraftEvent({ type: "SHOT", playerId: "p1", startX: 90, startY: 50 });
    expect(withoutOutcome.valid).toBe(false);
    expect(withoutOutcome.missing).toContain("outcome");

    const withOutcome = validateDraftEvent({
      type: "SHOT",
      playerId: "p1",
      startX: 90,
      startY: 50,
      outcome: "SUCCESS",
    });
    expect(withOutcome.valid).toBe(true);
  });

  it("GOAL does not require an outcome (implicit success) or a position to be auto-save ready once player+position given", () => {
    expect(isReadyToAutoSave({ type: "GOAL", playerId: "p1", startX: 95, startY: 50 })).toBe(true);
  });

  it("PLAYER_IN/PLAYER_OUT are the one case where a missing player still blocks the save (playerRequirement is REQUIRED — a substitution IS the player)", () => {
    expect(validateDraftEvent({ type: "PLAYER_IN" }).missing).toContain("player");
    expect(isReadyToAutoSave({ type: "PLAYER_IN", playerId: "p2" })).toBe(true);
    expect(isReadyToAutoSave({ type: "PLAYER_OUT", playerId: "p2" })).toBe(true);
  });

  it("TRANSFER requires both a start and end position", () => {
    const missingEnd = validateDraftEvent({ type: "TRANSFER", playerId: "p1", startX: 10, startY: 10, outcome: "SUCCESS" });
    expect(missingEnd.missing).toContain("endPosition");
  });
});
