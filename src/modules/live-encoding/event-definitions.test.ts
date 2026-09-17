import { describe, expect, it } from "vitest";
import { EVENT_DEFINITIONS, resolvePlayerRequirement } from "./event-definitions";

describe("resolvePlayerRequirement", () => {
  it("relaxes a RECOMMENDED type to OPTIONAL in BASIC mode", () => {
    expect(resolvePlayerRequirement(EVENT_DEFINITIONS.BALL_WIN, "BASIC")).toBe("OPTIONAL");
  });

  it("keeps the definition's own baseline in STANDARD and ADVANCED", () => {
    expect(resolvePlayerRequirement(EVENT_DEFINITIONS.BALL_WIN, "STANDARD")).toBe("RECOMMENDED");
    expect(resolvePlayerRequirement(EVENT_DEFINITIONS.BALL_WIN, "ADVANCED")).toBe("RECOMMENDED");
  });

  it("never relaxes REQUIRED (substitutions), even in BASIC", () => {
    expect(resolvePlayerRequirement(EVENT_DEFINITIONS.PLAYER_IN, "BASIC")).toBe("REQUIRED");
    expect(resolvePlayerRequirement(EVENT_DEFINITIONS.PLAYER_OUT, "BASIC")).toBe("REQUIRED");
  });

  it("PRESS supports multiple participants and never requires one", () => {
    expect(EVENT_DEFINITIONS.PRESS.participantSelectionMode).toBe("MULTIPLE");
    expect(resolvePlayerRequirement(EVENT_DEFINITIONS.PRESS, "BASIC")).toBe("OPTIONAL");
    expect(resolvePlayerRequirement(EVENT_DEFINITIONS.PRESS, "ADVANCED")).toBe("OPTIONAL");
  });

  it("no event type outside substitutions can ever hard-require a player", () => {
    for (const def of Object.values(EVENT_DEFINITIONS)) {
      if (def.type === "PLAYER_IN" || def.type === "PLAYER_OUT") continue;
      expect(def.playerRequirement).not.toBe("REQUIRED");
    }
  });
});
