import { describe, expect, it } from "vitest";
import { computeStints, isOnPitch, summarizeStints } from "./stints";

describe("computeStints", () => {
  it("gives every starter an implicit stint from t=0", () => {
    const stints = computeStints(["p1", "p2"], []);
    expect(stints).toHaveLength(2);
    expect(stints.every((s) => s.startMatchElapsedMs === 0 && s.endMatchElapsedMs === null)).toBe(true);
  });

  it("closes a starter's stint on PLAYER_OUT and opens a new one for the incoming player", () => {
    const stints = computeStints(
      ["p1"],
      [
        { playerId: "p1", type: "PLAYER_OUT", matchElapsedMs: 600_000, quarter: 1 },
        { playerId: "p2", type: "PLAYER_IN", matchElapsedMs: 600_000, quarter: 1 },
      ]
    );

    const p1Stint = stints.find((s) => s.playerId === "p1")!;
    expect(p1Stint.endMatchElapsedMs).toBe(600_000);

    const p2Stint = stints.find((s) => s.playerId === "p2")!;
    expect(p2Stint.startMatchElapsedMs).toBe(600_000);
    expect(p2Stint.endMatchElapsedMs).toBeNull();
  });

  it("supports multiple stints for the same player (in, out, back in)", () => {
    const stints = computeStints(
      ["p1"],
      [
        { playerId: "p1", type: "PLAYER_OUT", matchElapsedMs: 300_000, quarter: 1 },
        { playerId: "p1", type: "PLAYER_IN", matchElapsedMs: 500_000, quarter: 1 },
        { playerId: "p1", type: "PLAYER_OUT", matchElapsedMs: 800_000, quarter: 1 },
      ]
    );
    const p1Stints = stints.filter((s) => s.playerId === "p1");
    expect(p1Stints).toHaveLength(2);
    expect(p1Stints[0]).toMatchObject({ startMatchElapsedMs: 0, endMatchElapsedMs: 300_000 });
    expect(p1Stints[1]).toMatchObject({ startMatchElapsedMs: 500_000, endMatchElapsedMs: 800_000 });
  });

  it("closes any still-open stint at matchEndElapsedMs when provided", () => {
    const stints = computeStints(["p1"], [], 3_600_000);
    expect(stints[0].endMatchElapsedMs).toBe(3_600_000);
  });

  it("isOnPitch reflects the most recent computed stints", () => {
    const stints = computeStints(
      ["p1"],
      [{ playerId: "p1", type: "PLAYER_OUT", matchElapsedMs: 300_000, quarter: 1 }]
    );
    expect(isOnPitch("p1", stints)).toBe(false);
  });
});

describe("summarizeStints — time on pitch vs. match duration (spec §21/§59)", () => {
  it("distinguishes time on pitch from full match duration after a substitution", () => {
    const stints = computeStints(
      ["theo"],
      [{ playerId: "theo", type: "PLAYER_OUT", matchElapsedMs: 2_484_000 /* 41:24 */, quarter: 3 }]
    );
    const summary = summarizeStints("theo", stints, 3_600_000 /* full 60-minute match */);
    expect(summary.timeOnPitchMs).toBe(2_484_000);
    expect(summary.timeOnBenchMs).toBe(3_600_000 - 2_484_000);
    expect(summary.numberOfStints).toBe(1);
  });
});
