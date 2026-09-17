import { describe, expect, it } from "vitest";
import { computeMomentum } from "./momentum";
import type { EventType, HockeyEvent } from "@/types/database";

function makeEvent(overrides: Partial<HockeyEvent> & { event_type: EventType; match_elapsed_ms: number }): HockeyEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    match_id: "match-1",
    team_id: "us",
    is_opponent: false,
    player_id: null,
    secondary_player_id: null,
    possession_id: null,
    quarter: 1,
    absolute_timestamp: new Date().toISOString(),
    quarter_elapsed_ms: 0,
    event_category: "ATTACK",
    outcome: null,
    pressure_context: null,
    capture_level: "STANDARD",
    enrichment_status: "RAW",
    start_x: null,
    start_y: null,
    end_x: null,
    end_y: null,
    metadata: {},
    video_id: null,
    video_timestamp_ms: null,
    deleted_at: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeMomentum", () => {
  it("returns an empty curve for a non-positive duration", () => {
    expect(computeMomentum([], 0)).toEqual([]);
  });

  it("a GOAL raises the score at and after its timestamp, within the rolling window", () => {
    const events = [makeEvent({ event_type: "GOAL", match_elapsed_ms: 60_000 })];
    const points = computeMomentum(events, 120_000, 5 * 60_000, 60_000);

    const before = points.find((p) => p.matchElapsedMs === 0)!;
    const at = points.find((p) => p.matchElapsedMs === 60_000)!;
    const after = points.find((p) => p.matchElapsedMs === 120_000)!;

    expect(before.score).toBe(0);
    expect(at.score).toBe(10);
    expect(after.score).toBe(10); // still inside the 5-minute trailing window
  });

  it("drops an event's contribution once it falls outside the trailing window", () => {
    const events = [makeEvent({ event_type: "GOAL", match_elapsed_ms: 0 })];
    const points = computeMomentum(events, 10 * 60_000, 5 * 60_000, 60_000);

    const insideWindow = points.find((p) => p.matchElapsedMs === 4 * 60_000)!;
    const outsideWindow = points.find((p) => p.matchElapsedMs === 6 * 60_000)!;

    expect(insideWindow.score).toBe(10);
    expect(outsideWindow.score).toBe(0);
  });

  it("ignores deleted events and event types with no weight", () => {
    const events = [
      makeEvent({ event_type: "GOAL", match_elapsed_ms: 0, deleted_at: new Date().toISOString() }),
      makeEvent({ event_type: "POSSESSION_START", match_elapsed_ms: 0 }),
    ];
    const points = computeMomentum(events, 60_000, 5 * 60_000, 60_000);
    expect(points.every((p) => p.score === 0)).toBe(true);
  });

  it("sums multiple events within the same window", () => {
    const events = [
      makeEvent({ event_type: "SHOT", match_elapsed_ms: 0 }),
      makeEvent({ event_type: "TURNOVER", match_elapsed_ms: 30_000 }),
    ];
    const points = computeMomentum(events, 60_000, 5 * 60_000, 60_000);
    const last = points[points.length - 1];
    expect(last.score).toBe(3 - 1);
  });

  it("subtracts opponent-side events instead of adding them — a true two-team swing", () => {
    const events = [makeEvent({ event_type: "GOAL", match_elapsed_ms: 0, is_opponent: true })];
    const points = computeMomentum(events, 60_000, 5 * 60_000, 60_000);
    expect(points[points.length - 1].score).toBe(-10);
  });

  it("nets our events against the opponent's within the same window", () => {
    const events = [
      makeEvent({ event_type: "SHOT", match_elapsed_ms: 0 }),
      makeEvent({ event_type: "SHOT", match_elapsed_ms: 0, is_opponent: true }),
    ];
    const points = computeMomentum(events, 60_000, 5 * 60_000, 60_000);
    expect(points[points.length - 1].score).toBe(0);
  });
});
