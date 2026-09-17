import { describe, expect, it } from "vitest";
import { computePossessions, possessionPercentageBySide } from "./possession";
import type { HockeyEvent } from "@/types/database";

function makeEvent(overrides: Partial<HockeyEvent>): HockeyEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    match_id: "match-1",
    team_id: "team-1",
    is_opponent: false,
    player_id: null,
    secondary_player_id: null,
    possession_id: null,
    quarter: 1,
    absolute_timestamp: new Date().toISOString(),
    match_elapsed_ms: 0,
    quarter_elapsed_ms: 0,
    event_category: "POSSESSION",
    event_type: "POSSESSION_START",
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

describe("computePossessions", () => {
  it("pairs a START/END into one interval with a duration", () => {
    const events = [
      makeEvent({ event_type: "POSSESSION_START", team_id: "us", match_elapsed_ms: 1_000 }),
      makeEvent({ event_type: "POSSESSION_END", team_id: "us", match_elapsed_ms: 5_000 }),
    ];
    const intervals = computePossessions(events);
    expect(intervals).toHaveLength(1);
    expect(intervals[0].durationMs).toBe(4_000);
  });

  it("returns zero possessions when nothing is tagged (Sprint 1 has no auto-inference)", () => {
    expect(computePossessions([])).toEqual([]);
  });

  it("computes possession percentage by side (us vs opponent) — team_id is always ours", () => {
    const events = [
      makeEvent({ event_type: "POSSESSION_START", team_id: "team-1", is_opponent: false, match_elapsed_ms: 0 }),
      makeEvent({ event_type: "POSSESSION_END", team_id: "team-1", is_opponent: false, match_elapsed_ms: 6_000 }),
      makeEvent({ event_type: "POSSESSION_START", team_id: "team-1", is_opponent: true, match_elapsed_ms: 6_000 }),
      makeEvent({ event_type: "POSSESSION_END", team_id: "team-1", is_opponent: true, match_elapsed_ms: 10_000 }),
    ];
    const pct = possessionPercentageBySide(computePossessions(events));
    expect(pct.get("us")).toBeCloseTo(60);
    expect(pct.get("opponent")).toBeCloseTo(40);
  });

  it("keeps an opponent possession from closing our own open possession on the same team_id", () => {
    const events = [
      makeEvent({ event_type: "POSSESSION_START", team_id: "team-1", is_opponent: false, match_elapsed_ms: 0 }),
      makeEvent({ event_type: "POSSESSION_START", team_id: "team-1", is_opponent: true, match_elapsed_ms: 1_000 }),
      makeEvent({ event_type: "POSSESSION_END", team_id: "team-1", is_opponent: true, match_elapsed_ms: 3_000 }),
      makeEvent({ event_type: "POSSESSION_END", team_id: "team-1", is_opponent: false, match_elapsed_ms: 5_000 }),
    ];
    const intervals = computePossessions(events);
    expect(intervals).toHaveLength(2);
    expect(intervals.find((i) => !i.isOpponent)?.durationMs).toBe(5_000);
    expect(intervals.find((i) => i.isOpponent)?.durationMs).toBe(2_000);
  });
});
