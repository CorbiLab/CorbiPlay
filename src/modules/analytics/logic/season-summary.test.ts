import { describe, expect, it } from "vitest";
import { computeSeasonSummary } from "./season-summary";
import type { HockeyEvent, Match } from "@/types/database";

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    season_id: "season-1",
    team_id: "team-1",
    competition: null,
    match_date: "2026-09-01",
    venue: null,
    opponent_name: "Opponent",
    opponent_logo_url: null,
    home_or_away: "HOME",
    our_score: 0,
    opponent_score: 0,
    status: "FINISHED",
    number_of_quarters: 4,
    quarter_duration_minutes: 15,
    current_quarter: 4,
    quarter_started_at: null,
    quarter_paused_at: null,
    quarter_paused_ms_total: 0,
    attacking_directions: null,
    video_url: null,
    video_quarter_offsets_ms: {},
    custom_encoding_types: [],
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function makeEvent(matchId: string, overrides: Partial<HockeyEvent>): HockeyEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    match_id: matchId,
    team_id: "team-1",
    is_opponent: false,
    player_id: null,
    secondary_player_id: null,
    possession_id: null,
    quarter: 1,
    absolute_timestamp: new Date().toISOString(),
    match_elapsed_ms: 0,
    quarter_elapsed_ms: 0,
    event_category: "ATTACK",
    event_type: "GOAL",
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

describe("computeSeasonSummary", () => {
  it("returns an empty summary with no matches", () => {
    const summary = computeSeasonSummary([], new Map());
    expect(summary).toEqual({
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      cards: { green: 0, yellow: 0, red: 0 },
      perPlayer: [],
      matchResults: [],
    });
  });

  it("ignores non-FINISHED matches entirely, even with events", () => {
    const scheduled = makeMatch({ id: "m1", status: "SCHEDULED" });
    const events = new Map([["m1", [makeEvent("m1", { event_type: "GOAL" })]]]);
    const summary = computeSeasonSummary([scheduled], events);
    expect(summary.played).toBe(0);
  });

  it("classifies win/draw/loss from our recomputed score vs. the opponent's counter", () => {
    const win = makeMatch({ id: "win", opponent_score: 1 });
    const draw = makeMatch({ id: "draw", opponent_score: 2 });
    const loss = makeMatch({ id: "loss", opponent_score: 5 });
    const events = new Map([
      ["win", [makeEvent("win", { event_type: "GOAL" }), makeEvent("win", { event_type: "GOAL" })]], // 2-1
      ["draw", [makeEvent("draw", { event_type: "GOAL" }), makeEvent("draw", { event_type: "GOAL" })]], // 2-2
      ["loss", [makeEvent("loss", { event_type: "GOAL" })]], // 1-5
    ]);
    const summary = computeSeasonSummary([win, draw, loss], events);
    expect(summary.wins).toBe(1);
    expect(summary.draws).toBe(1);
    expect(summary.losses).toBe(1);
    expect(summary.played).toBe(3);
  });

  it("sums goals for/against and discipline cards across every finished match", () => {
    const m1 = makeMatch({ id: "m1", opponent_score: 1 });
    const m2 = makeMatch({ id: "m2", opponent_score: 0 });
    const events = new Map([
      ["m1", [makeEvent("m1", { event_type: "GOAL" }), makeEvent("m1", { event_type: "YELLOW_CARD" })]],
      ["m2", [makeEvent("m2", { event_type: "GOAL" }), makeEvent("m2", { event_type: "GREEN_CARD" }), makeEvent("m2", { event_type: "RED_CARD" })]],
    ]);
    const summary = computeSeasonSummary([m1, m2], events);
    expect(summary.goalsFor).toBe(2);
    expect(summary.goalsAgainst).toBe(1);
    expect(summary.cards).toEqual({ green: 1, yellow: 1, red: 1 });
  });

  it("aggregates goals and assists per player across matches, sorted by goals desc", () => {
    const m1 = makeMatch({ id: "m1" });
    const m2 = makeMatch({ id: "m2" });
    const events = new Map([
      ["m1", [makeEvent("m1", { event_type: "GOAL", player_id: "p1", secondary_player_id: "p2" })]],
      ["m2", [
        makeEvent("m2", { event_type: "GOAL", player_id: "p1" }),
        makeEvent("m2", { event_type: "GOAL", player_id: "p2", secondary_player_id: "p1" }),
      ]],
    ]);
    const summary = computeSeasonSummary([m1, m2], events);
    expect(summary.perPlayer).toEqual([
      { playerId: "p1", goals: 2, assists: 1 },
      { playerId: "p2", goals: 1, assists: 1 },
    ]);
  });

  it("excludes deleted and opponent-side events from the season rollup", () => {
    const m1 = makeMatch({ id: "m1" });
    const events = new Map([
      ["m1", [
        makeEvent("m1", { event_type: "GOAL", deleted_at: new Date().toISOString() }),
        makeEvent("m1", { event_type: "GOAL", is_opponent: true }),
      ]],
    ]);
    const summary = computeSeasonSummary([m1], events);
    expect(summary.goalsFor).toBe(0);
  });

  it("orders matchResults chronologically, oldest first", () => {
    const later = makeMatch({ id: "later", match_date: "2026-09-20" });
    const earlier = makeMatch({ id: "earlier", match_date: "2026-09-01" });
    const summary = computeSeasonSummary([later, earlier], new Map());
    expect(summary.matchResults.map((r) => r.matchId)).toEqual(["earlier", "later"]);
  });

  it("a match with no events at all is a scoreless draw, not an error", () => {
    const m1 = makeMatch({ id: "m1", opponent_score: 0 });
    const summary = computeSeasonSummary([m1], new Map());
    expect(summary.matchResults[0]).toMatchObject({ ourScore: 0, opponentScore: 0, result: "DRAW" });
  });
});
