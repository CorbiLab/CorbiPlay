import { describe, expect, it } from "vitest";
import {
  endQuarter,
  formatClock,
  getMatchElapsedMs,
  getQuarterElapsedMs,
  isPaused,
  isRunning,
  parseClock,
  pauseQuarter,
  resetQuarter,
  resumeQuarter,
  startQuarter,
} from "./clock";

describe("match clock", () => {
  it("returns 0 elapsed before the quarter starts", () => {
    const anchor = { quarterStartedAt: null, quarterPausedAt: null, quarterPausedMsTotal: 0 };
    expect(getQuarterElapsedMs(anchor)).toBe(0);
  });

  it("computes elapsed time from the start anchor", () => {
    const t0 = 1_000_000;
    const patch = startQuarter(1, t0);
    expect(getQuarterElapsedMs(patch, t0 + 5_000)).toBe(5_000);
  });

  it("freezes elapsed time while paused", () => {
    const t0 = 1_000_000;
    const started = startQuarter(1, t0);
    const paused = pauseQuarter(started, t0 + 10_000);
    expect(isPaused(paused)).toBe(true);
    expect(getQuarterElapsedMs(paused, t0 + 999_000)).toBe(10_000);
  });

  it("resumes and accumulates paused duration so elapsed stays continuous", () => {
    const t0 = 1_000_000;
    const started = startQuarter(1, t0);
    const paused = pauseQuarter(started, t0 + 10_000);
    const resumed = resumeQuarter(paused, t0 + 40_000); // paused for 30s
    expect(isRunning(resumed)).toBe(true);
    // 50s after start, minus the 30s pause => 20s elapsed
    expect(getQuarterElapsedMs(resumed, t0 + 50_000)).toBe(20_000);
  });

  it("survives a 'page refresh' — recomputing from the same anchor gives the same answer", () => {
    const t0 = 1_000_000;
    const started = startQuarter(2, t0);
    const elapsedBeforeRefresh = getQuarterElapsedMs(started, t0 + 12_345);
    // "refresh": nothing but the anchor persists; recompute from scratch.
    const elapsedAfterRefresh = getQuarterElapsedMs(started, t0 + 12_345);
    expect(elapsedAfterRefresh).toBe(elapsedBeforeRefresh);
  });

  it("computes match elapsed across prior quarters", () => {
    const t0 = 1_000_000;
    const anchor = startQuarter(3, t0); // starting Q3
    // 2 prior quarters of 15 min each = 1,800,000ms, plus 4s into Q3
    expect(getMatchElapsedMs(15, 3, anchor, t0 + 4_000)).toBe(1_800_000 + 4_000);
  });

  it("endQuarter freezes the clock (equivalent to pause)", () => {
    const t0 = 1_000_000;
    const started = startQuarter(1, t0);
    const ended = endQuarter(started, t0 + 900_000);
    expect(getQuarterElapsedMs(ended, t0 + 5_000_000)).toBe(900_000);
  });

  it("resetQuarter re-anchors a running clock back to 0, still running", () => {
    const t0 = 1_000_000;
    const started = startQuarter(1, t0);
    const running = getQuarterElapsedMs(started, t0 + 300_000);
    expect(running).toBe(300_000);
    const reset = resetQuarter(started, t0 + 300_000);
    expect(isRunning(reset)).toBe(true);
    expect(getQuarterElapsedMs(reset, t0 + 300_000)).toBe(0);
    expect(getQuarterElapsedMs(reset, t0 + 305_000)).toBe(5_000);
  });

  it("resetQuarter re-anchors a paused clock back to 0, still paused", () => {
    const t0 = 1_000_000;
    const started = startQuarter(1, t0);
    const paused = pauseQuarter(started, t0 + 300_000);
    const reset = resetQuarter(paused, t0 + 300_000);
    expect(isPaused(reset)).toBe(true);
    expect(getQuarterElapsedMs(reset, t0 + 999_000)).toBe(0);
  });

  it("formats mm:ss", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65_000)).toBe("01:05");
    expect(formatClock(900_000)).toBe("15:00");
  });

  it("parses mm:ss and h:mm:ss back into ms — the inverse of formatClock", () => {
    expect(parseClock("00:00")).toBe(0);
    expect(parseClock("01:05")).toBe(65_000);
    expect(parseClock("15:00")).toBe(900_000);
    expect(parseClock("1:02:03")).toBe((62 * 60 + 3) * 1000);
  });

  it("rejects anything that isn't a clean mm:ss/h:mm:ss", () => {
    expect(parseClock("")).toBeNull();
    expect(parseClock("abc")).toBeNull();
    expect(parseClock("12")).toBeNull();
    expect(parseClock("12:60")).toBeNull();
    expect(parseClock("12:-5")).toBeNull();
  });
});
