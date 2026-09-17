import { describe, expect, it } from "vitest";
import {
  computeConversionFunnel,
  didSequenceGenerateGoal,
  didSequenceGenerateShot,
  didSequenceReachCircle,
  didSequenceReachEntry25,
  getPossessionEvents,
  getSequenceDurationMs,
  isDefensiveTurnover,
  isHighBallWin,
  timeToFirstEventType,
} from "./sequences";
import type { EventType, HockeyEvent, Possession } from "@/types/database";

function makeEvent(overrides: Partial<HockeyEvent> & { event_type: EventType }): HockeyEvent {
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
    match_elapsed_ms: 0,
    quarter_elapsed_ms: 0,
    event_category: "PROGRESSION",
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

function makePossession(overrides: Partial<Possession> = {}): Possession {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    match_id: "match-1",
    team_id: "us",
    is_opponent: false,
    quarter: 1,
    start_timestamp: null,
    end_timestamp: null,
    start_match_elapsed_ms: 0,
    end_match_elapsed_ms: null,
    start_x: null,
    start_y: null,
    end_x: null,
    end_y: null,
    possession_start_type: null,
    attack_type: null,
    tactical_context: null,
    outcome: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("getPossessionEvents", () => {
  it("only includes the team's own events within the time window", () => {
    const possession = makePossession({ start_match_elapsed_ms: 1_000, end_match_elapsed_ms: 5_000 });
    const events = [
      makeEvent({ event_type: "BALL_WIN", match_elapsed_ms: 1_000 }),
      makeEvent({ event_type: "ENTRY_25", match_elapsed_ms: 3_000 }),
      makeEvent({ event_type: "SHOT", match_elapsed_ms: 6_000 }), // after the window
      makeEvent({ event_type: "TURNOVER", match_elapsed_ms: 2_000, team_id: "opponent" }), // other team
      makeEvent({ event_type: "GOAL", match_elapsed_ms: 4_000, deleted_at: new Date().toISOString() }), // deleted
    ];

    const sequence = getPossessionEvents(possession, events);
    expect(sequence.map((e) => e.event_type)).toEqual(["BALL_WIN", "ENTRY_25"]);
  });

  it("excludes opponent-side events sharing the same team_id (spec §16 — team_id is always ours)", () => {
    const ourPossession = makePossession({ team_id: "team-1", is_opponent: false, start_match_elapsed_ms: 0, end_match_elapsed_ms: 10_000 });
    const events = [
      makeEvent({ event_type: "BALL_WIN", team_id: "team-1", is_opponent: false, match_elapsed_ms: 1_000 }),
      makeEvent({ event_type: "SHOT", team_id: "team-1", is_opponent: true, match_elapsed_ms: 2_000 }),
    ];
    expect(getPossessionEvents(ourPossession, events).map((e) => e.event_type)).toEqual(["BALL_WIN"]);
  });
});

describe("getSequenceDurationMs", () => {
  it("returns null while the possession is still open", () => {
    expect(getSequenceDurationMs(makePossession({ end_match_elapsed_ms: null }))).toBeNull();
  });

  it("returns the elapsed duration once closed", () => {
    expect(getSequenceDurationMs(makePossession({ start_match_elapsed_ms: 1_000, end_match_elapsed_ms: 19_400 }))).toBe(18_400);
  });
});

describe("sequence reach helpers", () => {
  const possession = makePossession({ start_match_elapsed_ms: 0, end_match_elapsed_ms: 10_000 });
  const events = [
    makeEvent({ event_type: "BALL_WIN", match_elapsed_ms: 0 }),
    makeEvent({ event_type: "ENTRY_25", match_elapsed_ms: 2_000 }),
    makeEvent({ event_type: "CIRCLE_ENTRY", match_elapsed_ms: 4_000 }),
    makeEvent({ event_type: "SHOT", match_elapsed_ms: 5_000 }),
  ];

  it("detects each stage the sequence actually reached", () => {
    expect(didSequenceReachEntry25(possession, events)).toBe(true);
    expect(didSequenceReachCircle(possession, events)).toBe(true);
    expect(didSequenceGenerateShot(possession, events)).toBe(true);
    expect(didSequenceGenerateGoal(possession, events)).toBe(false);
  });

  it("computes time from the sequence start to a given stage", () => {
    expect(timeToFirstEventType(possession, events, "SHOT")).toBe(5_000);
    expect(timeToFirstEventType(possession, events, "GOAL")).toBeNull();
  });
});

describe("isHighBallWin", () => {
  it("is true for a BALL_WIN recovered in the attacking half", () => {
    const event = makeEvent({ event_type: "BALL_WIN", start_x: 80, start_y: 50 });
    expect(isHighBallWin(event, "RIGHT")).toBe(true);
    expect(isHighBallWin(event, "LEFT")).toBe(false);
  });

  it("is false for any other event type even in the attacking half", () => {
    const event = makeEvent({ event_type: "TURNOVER", start_x: 80, start_y: 50 });
    expect(isHighBallWin(event, "RIGHT")).toBe(false);
  });
});

describe("isDefensiveTurnover", () => {
  it("is true for a TURNOVER conceded in the defensive 25", () => {
    const event = makeEvent({ event_type: "TURNOVER", start_x: 15, start_y: 50 });
    expect(isDefensiveTurnover(event, "RIGHT")).toBe(true);
    expect(isDefensiveTurnover(event, "LEFT")).toBe(false);
  });
});

describe("computeConversionFunnel", () => {
  it("counts each stage and derives percentages from the previous stage and from total possessions", () => {
    // 4 possessions: 2 reach Entry 25, 1 of those reaches a Shot, none score.
    const possessions = [
      makePossession({ id: "p1", start_match_elapsed_ms: 0, end_match_elapsed_ms: 10_000 }),
      makePossession({ id: "p2", start_match_elapsed_ms: 20_000, end_match_elapsed_ms: 30_000 }),
      makePossession({ id: "p3", start_match_elapsed_ms: 40_000, end_match_elapsed_ms: 50_000 }),
      makePossession({ id: "p4", start_match_elapsed_ms: 60_000, end_match_elapsed_ms: 70_000 }),
    ];
    const events = [
      makeEvent({ event_type: "ENTRY_25", match_elapsed_ms: 1_000 }),
      makeEvent({ event_type: "SHOT", match_elapsed_ms: 2_000 }),
      makeEvent({ event_type: "ENTRY_25", match_elapsed_ms: 21_000 }),
    ];

    const funnel = computeConversionFunnel(possessions, events);

    expect(funnel.possessionCount).toBe(4);
    const entry25 = funnel.stages.find((s) => s.eventType === "ENTRY_25")!;
    expect(entry25.count).toBe(2);
    expect(entry25.pctOfPossessions).toBe(50);
    expect(entry25.pctOfPrevious).toBe(50);

    const circle = funnel.stages.find((s) => s.eventType === "CIRCLE_ENTRY")!;
    expect(circle.count).toBe(0);
    expect(circle.pctOfPrevious).toBe(0);

    const shot = funnel.stages.find((s) => s.eventType === "SHOT")!;
    expect(shot.count).toBe(1);
    expect(shot.pctOfPossessions).toBe(25);
  });

  it("returns null percentages when there are no possessions at all", () => {
    const funnel = computeConversionFunnel([], []);
    expect(funnel.possessionCount).toBe(0);
    expect(funnel.stages[0].pctOfPossessions).toBeNull();
  });
});
