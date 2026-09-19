import { describe, expect, it } from "vitest";
import { EVENT_DEFINITIONS, resolvePlayerRequirement, getLiveEncodingButtonGroups } from "./event-definitions";

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

describe("getLiveEncodingButtonGroups", () => {
  it("BASIC shows only the bare-minimum scoreline/transition/discipline set", () => {
    const types = getLiveEncodingButtonGroups("BASIC").flatMap((g) => g.types);
    expect(types.sort()).toEqual(
      ["BALL_WIN", "CIRCLE_ENTRY", "GOAL", "GREEN_CARD", "PC_WON", "RED_CARD", "TURNOVER", "YELLOW_CARD"].sort()
    );
  });

  it("STANDARD is a strict superset of BASIC", () => {
    const basic = new Set(getLiveEncodingButtonGroups("BASIC").flatMap((g) => g.types));
    const standard = new Set(getLiveEncodingButtonGroups("STANDARD").flatMap((g) => g.types));
    for (const type of basic) expect(standard.has(type)).toBe(true);
    expect(standard.size).toBeGreaterThan(basic.size);
  });

  it("STANDARD and ADVANCED both show the full original grid (unchanged, identical for now)", () => {
    const standard = getLiveEncodingButtonGroups("STANDARD").flatMap((g) => g.types);
    const advanced = getLiveEncodingButtonGroups("ADVANCED").flatMap((g) => g.types);
    expect(standard).toEqual(advanced);
    expect(standard).toContain("PRESS");
    expect(standard).toContain("POSSESSION_START");
    expect(standard).toContain("KEY_PASS");
  });

  it("drops a category entirely when none of its types survive the level's allowlist", () => {
    const basicCategories = getLiveEncodingButtonGroups("BASIC").map((g) => g.category);
    expect(basicCategories).not.toContain("PRESS");
    expect(basicCategories).not.toContain("POSSESSION");
    expect(basicCategories).not.toContain("DEFENCE");
  });

  it("CUSTOM with no selection shows nothing — never silently falls back to the full grid", () => {
    expect(getLiveEncodingButtonGroups("CUSTOM")).toEqual([]);
    expect(getLiveEncodingButtonGroups("CUSTOM", [])).toEqual([]);
  });

  it("CUSTOM shows exactly the analyst's own picks, regardless of BASIC/STANDARD/ADVANCED groupings", () => {
    const types = getLiveEncodingButtonGroups("CUSTOM", ["GOAL", "TACKLE"]).flatMap((g) => g.types);
    expect(types.sort()).toEqual(["GOAL", "TACKLE"].sort());
  });
});
