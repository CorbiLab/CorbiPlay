import { describe, expect, it } from "vitest";
import { classifyRisk, computeWorkloadSummary, type DailyLoadEntry } from "./load";

function isoDaysAgo(asOf: Date, days: number): string {
  const d = new Date(asOf);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

describe("computeWorkloadSummary", () => {
  it("returns zero load and a null ratio with no entries at all", () => {
    const asOf = new Date("2026-09-21T12:00:00Z");
    const summary = computeWorkloadSummary([], asOf);
    expect(summary).toEqual({ acuteLoad: 0, chronicLoad: 0, ratio: null });
  });

  it("averages a single day's load over the full window — a rest day counts as 0, not as absent", () => {
    const asOf = new Date("2026-09-21T12:00:00Z");
    const entries: DailyLoadEntry[] = [{ date: isoDaysAgo(asOf, 0), sessionLoad: 700 }];
    const summary = computeWorkloadSummary(entries, asOf);
    expect(summary.acuteLoad).toBeCloseTo(700 / 7);
    expect(summary.chronicLoad).toBeCloseTo(700 / 28);
  });

  it("sums two sessions landing on the same calendar date instead of overwriting", () => {
    const asOf = new Date("2026-09-21T12:00:00Z");
    const today = isoDaysAgo(asOf, 0);
    const entries: DailyLoadEntry[] = [
      { date: today, sessionLoad: 300 },
      { date: today, sessionLoad: 200 },
    ];
    const summary = computeWorkloadSummary(entries, asOf);
    expect(summary.acuteLoad).toBeCloseTo(500 / 7);
  });

  it("excludes load older than 28 days from the chronic window entirely", () => {
    const asOf = new Date("2026-09-21T12:00:00Z");
    const entries: DailyLoadEntry[] = [{ date: isoDaysAgo(asOf, 40), sessionLoad: 1000 }];
    const summary = computeWorkloadSummary(entries, asOf);
    expect(summary.acuteLoad).toBe(0);
    expect(summary.chronicLoad).toBe(0);
    expect(summary.ratio).toBeNull();
  });

  it("computes a stable 1.0 ratio when daily load has been perfectly constant", () => {
    const asOf = new Date("2026-09-21T12:00:00Z");
    const entries: DailyLoadEntry[] = Array.from({ length: 28 }, (_, i) => ({
      date: isoDaysAgo(asOf, i),
      sessionLoad: 400,
    }));
    const summary = computeWorkloadSummary(entries, asOf);
    expect(summary.ratio).toBeCloseTo(1.0);
  });

  it("spikes above 1 when recent load jumps above the chronic baseline", () => {
    const asOf = new Date("2026-09-21T12:00:00Z");
    const entries: DailyLoadEntry[] = [
      ...Array.from({ length: 7 }, (_, i) => ({ date: isoDaysAgo(asOf, i), sessionLoad: 900 })),
      ...Array.from({ length: 21 }, (_, i) => ({ date: isoDaysAgo(asOf, i + 7), sessionLoad: 300 })),
    ];
    const summary = computeWorkloadSummary(entries, asOf);
    expect(summary.ratio).toBeGreaterThan(1.3);
  });
});

describe("classifyRisk", () => {
  it("flags no chronic history as NO_DATA, not OPTIMAL", () => {
    expect(classifyRisk(null)).toBe("NO_DATA");
  });

  it("bands the conventional ACWR thresholds", () => {
    expect(classifyRisk(0.5)).toBe("UNDERTRAINED");
    expect(classifyRisk(1.0)).toBe("OPTIMAL");
    expect(classifyRisk(1.4)).toBe("CAUTION");
    expect(classifyRisk(1.8)).toBe("HIGH_RISK");
  });

  it("treats the band edges as inclusive on their lower side", () => {
    expect(classifyRisk(0.8)).toBe("OPTIMAL");
    expect(classifyRisk(1.3)).toBe("OPTIMAL");
    expect(classifyRisk(1.5)).toBe("CAUTION");
  });
});
