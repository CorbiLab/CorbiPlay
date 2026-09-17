import { describe, expect, it } from "vitest";
import { computeMatchStats, computeOpponentEventCounts } from "./match-stats";
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

describe("computeMatchStats", () => {
  it("counts our score from GOAL and PC_GOAL events only", () => {
    const events = [
      makeEvent({ event_type: "GOAL", event_category: "ATTACK", player_id: "theo" }),
      makeEvent({ event_type: "PC_GOAL", event_category: "PC", player_id: "theo" }),
      makeEvent({ event_type: "SHOT", event_category: "ATTACK", player_id: "theo" }),
    ];
    expect(computeMatchStats(events).ourScore).toBe(2);
  });

  it("ignores soft-deleted events (undo)", () => {
    const events = [
      makeEvent({ event_type: "GOAL", player_id: "theo" }),
      makeEvent({ event_type: "GOAL", player_id: "theo", deleted_at: new Date().toISOString() }),
    ];
    expect(computeMatchStats(events).ourScore).toBe(1);
  });

  it("attributes an assist to the secondary player on a GOAL", () => {
    const events = [makeEvent({ event_type: "GOAL", player_id: "theo", secondary_player_id: "arthur" })];
    const stats = computeMatchStats(events);
    expect(stats.perPlayer.get("theo")?.goals).toBe(1);
    expect(stats.perPlayer.get("arthur")?.assists).toBe(1);
  });

  it("builds per-player stat lines from ball wins, entries and shots", () => {
    const events = [
      makeEvent({ event_type: "BALL_WIN", player_id: "theo" }),
      makeEvent({ event_type: "ENTRY_25", player_id: "theo" }),
      makeEvent({ event_type: "CIRCLE_ENTRY", player_id: "theo" }),
      makeEvent({ event_type: "SHOT", player_id: "theo", outcome: "FAIL" }),
    ];
    const stats = computeMatchStats(events).perPlayer.get("theo")!;
    expect(stats).toMatchObject({ ballWins: 1, entries25: 1, circleEntries: 1, shots: 1 });
  });

  it("excludes opponent-side events from our own stats and score", () => {
    const events = [
      makeEvent({ event_type: "GOAL", player_id: "theo" }),
      makeEvent({ event_type: "GOAL", is_opponent: true }),
      makeEvent({ event_type: "BALL_WIN", is_opponent: true }),
    ];
    const stats = computeMatchStats(events);
    expect(stats.ourScore).toBe(1);
    expect(stats.countsByType.BALL_WIN).toBeUndefined();
  });
});

describe("computeOpponentEventCounts", () => {
  it("counts only opponent-side, non-deleted events", () => {
    const events = [
      makeEvent({ event_type: "BALL_WIN", is_opponent: true }),
      makeEvent({ event_type: "BALL_WIN", is_opponent: true, deleted_at: new Date().toISOString() }),
      makeEvent({ event_type: "SHOT", is_opponent: false }),
    ];
    expect(computeOpponentEventCounts(events)).toEqual({ BALL_WIN: 1 });
  });
});
