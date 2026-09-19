import { describe, expect, it } from "vitest";
import { computeZoneCounts } from "./pitch-heatmap";
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
    event_category: "TRANSITION",
    event_type: "BALL_WIN",
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

describe("computeZoneCounts", () => {
  it("returns all 12 zones, most at zero, when there are no positioned events", () => {
    const zones = computeZoneCounts([]);
    expect(zones).toHaveLength(12);
    expect(zones.every((z) => z.count === 0)).toBe(true);
  });

  it("counts an event into the zone containing its start position", () => {
    const events = [makeEvent({ start_x: 12.5, start_y: 16.67 })]; // col0-row0's centre
    const zones = computeZoneCounts(events);
    const hit = zones.find((z) => z.zoneId === "col0-row0")!;
    expect(hit.count).toBe(1);
    expect(zones.filter((z) => z.count > 0)).toHaveLength(1);
  });

  it("ignores deleted and unpositioned events", () => {
    const events = [
      makeEvent({ start_x: 12.5, start_y: 16.67, deleted_at: new Date().toISOString() }),
      makeEvent({ start_x: null, start_y: null }),
    ];
    const zones = computeZoneCounts(events);
    expect(zones.every((z) => z.count === 0)).toBe(true);
  });

  it("excludes opponent-side events — a heatmap of our activity must never include theirs (ADR-004)", () => {
    const events = [makeEvent({ start_x: 12.5, start_y: 16.67, is_opponent: true })];
    const zones = computeZoneCounts(events);
    expect(zones.every((z) => z.count === 0)).toBe(true);
  });

  it("splits counts across the two halves of the old middle band (12-zone split)", () => {
    const events = [
      makeEvent({ start_x: 37.5, start_y: 50 }), // MIDDLE_DEFENSIVE (own half)
      makeEvent({ start_x: 62.5, start_y: 50 }), // MIDDLE_ATTACKING (opposition half)
    ];
    const zones = computeZoneCounts(events);
    expect(zones.find((z) => z.zoneId === "col1-row1")?.count).toBe(1);
    expect(zones.find((z) => z.zoneId === "col2-row1")?.count).toBe(1);
  });
});
