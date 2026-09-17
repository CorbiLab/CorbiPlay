/**
 * DEMO MODE fixtures — mirrors supabase/seed.sql exactly (same ids), so the
 * app behaves identically once a real Supabase project replaces this data.
 * Used only when NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are not set. See
 * docs/ARCHITECTURE.md and src/config/app.ts::isSupabaseConfigured.
 *
 * This is NOT a fake external integration (spec §89) — it's our own app's
 * data, clearly confined to local development, never presented as synced
 * from anywhere.
 */
import type {
  Club,
  EventParticipant,
  HockeyEvent,
  Match,
  MatchRoster,
  Player,
  PlayerPosition,
  PlayerStint,
  Possession,
  Season,
  Team,
  TeamMembership,
} from "@/types/database";

export const DEMO_CLUB_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_SEASON_ID = "22222222-2222-2222-2222-222222222221";
export const TEAM_U14_ID = "33333333-3333-3333-3333-333333333301";
export const TEAM_U16_ID = "33333333-3333-3333-3333-333333333302";
export const TEAM_U19_ID = "33333333-3333-3333-3333-333333333303";
export const TEAM_MEN1_ID = "33333333-3333-3333-3333-333333333304";
export const SCHEDULED_MATCH_ID = "55555555-5555-5555-5555-555555555501";
export const FINISHED_MATCH_ID = "55555555-5555-5555-5555-555555555502";
export const THEO_ID = "44444444-4444-4444-4444-444444444408";

const now = new Date().toISOString();

export const demoClub: Club = {
  id: DEMO_CLUB_ID,
  name: "Waterloo Ducks",
  short_name: "Ducks",
  logo_url: null,
  country: "BE",
  primary_color: "#008E46",
  secondary_color: "#FFFFFF",
  created_at: now,
  updated_at: now,
};

export const demoSeason: Season = {
  id: DEMO_SEASON_ID,
  club_id: DEMO_CLUB_ID,
  name: "2026-2027",
  start_date: "2026-08-01",
  end_date: "2027-06-30",
  active: true,
  created_at: now,
};

export const demoTeams: Team[] = [
  { id: TEAM_U14_ID, club_id: DEMO_CLUB_ID, season_id: DEMO_SEASON_ID, name: "Waterloo Ducks U14 Boys", short_name: "U14 Boys", age_category: "U14", gender: "BOYS", level: "CLUB", logo_url: null, active: true, created_at: now, updated_at: now },
  { id: TEAM_U16_ID, club_id: DEMO_CLUB_ID, season_id: DEMO_SEASON_ID, name: "Waterloo Ducks U16 Boys", short_name: "U16 Boys", age_category: "U16", gender: "BOYS", level: "CLUB", logo_url: null, active: true, created_at: now, updated_at: now },
  { id: TEAM_U19_ID, club_id: DEMO_CLUB_ID, season_id: DEMO_SEASON_ID, name: "Waterloo Ducks U19 Boys", short_name: "U19 Boys", age_category: "U19", gender: "BOYS", level: "CLUB", logo_url: null, active: true, created_at: now, updated_at: now },
  { id: TEAM_MEN1_ID, club_id: DEMO_CLUB_ID, season_id: DEMO_SEASON_ID, name: "Waterloo Ducks Men 1", short_name: "Men 1", age_category: "SENIOR", gender: "MEN", level: "PREMIER", logo_url: null, active: true, created_at: now, updated_at: now },
];

interface DemoPlayerSeed {
  id: string;
  first: string;
  last: string;
  birth: string;
  shirt: number;
  positions: PlayerPosition[];
}

const U16_PLAYER_SEEDS: DemoPlayerSeed[] = [
  { id: "44444444-4444-4444-4444-444444444401", first: "Noah", last: "Delvaux", birth: "2010-02-11", shirt: 1, positions: ["GOALKEEPER"] },
  { id: "44444444-4444-4444-4444-444444444402", first: "Liam", last: "Verhoeven", birth: "2010-05-23", shirt: 2, positions: ["DEFENDER"] },
  { id: "44444444-4444-4444-4444-444444444403", first: "Adam", last: "Lefèvre", birth: "2010-01-30", shirt: 3, positions: ["DEFENDER"] },
  { id: "44444444-4444-4444-4444-444444444404", first: "Ethan", last: "Maes", birth: "2009-11-02", shirt: 4, positions: ["DEFENDER"] },
  { id: "44444444-4444-4444-4444-444444444405", first: "Gabriel", last: "Willems", birth: "2010-07-19", shirt: 5, positions: ["DEFENDER"] },
  { id: "44444444-4444-4444-4444-444444444406", first: "Nathan", last: "Peeters", birth: "2010-03-14", shirt: 6, positions: ["MIDFIELDER"] },
  { id: "44444444-4444-4444-4444-444444444407", first: "Hugo", last: "Lambert", birth: "2009-09-27", shirt: 7, positions: ["MIDFIELDER"] },
  { id: THEO_ID, first: "Théo", last: "Dubois", birth: "2010-04-05", shirt: 8, positions: ["MIDFIELDER", "FORWARD"] },
  { id: "44444444-4444-4444-4444-444444444409", first: "Arthur", last: "Claes", birth: "2010-06-08", shirt: 10, positions: ["MIDFIELDER"] },
  { id: "44444444-4444-4444-4444-444444444410", first: "Louis", last: "Vandenberghe", birth: "2009-12-17", shirt: 11, positions: ["FORWARD"] },
  { id: "44444444-4444-4444-4444-444444444411", first: "Mathis", last: "Janssens", birth: "2010-08-21", shirt: 12, positions: ["FORWARD"] },
  { id: "44444444-4444-4444-4444-444444444412", first: "Tom", last: "Wouters", birth: "2010-02-28", shirt: 14, positions: ["FORWARD"] },
  { id: "44444444-4444-4444-4444-444444444413", first: "Victor", last: "Michaux", birth: "2009-10-09", shirt: 15, positions: ["DEFENDER"] },
  { id: "44444444-4444-4444-4444-444444444414", first: "Antoine", last: "Gerard", birth: "2010-05-04", shirt: 16, positions: ["MIDFIELDER"] },
  { id: "44444444-4444-4444-4444-444444444415", first: "Simon", last: "Dumont", birth: "2010-09-13", shirt: 17, positions: ["FORWARD"] },
  { id: "44444444-4444-4444-4444-444444444416", first: "Léo", last: "Bosmans", birth: "2010-01-22", shirt: 18, positions: ["GOALKEEPER"] },
];

export const demoPlayers: Player[] = U16_PLAYER_SEEDS.map((p) => ({
  id: p.id,
  club_id: DEMO_CLUB_ID,
  first_name: p.first,
  last_name: p.last,
  display_name: p.first,
  birth_date: p.birth,
  photo_url: null,
  height_cm: null,
  weight_kg: null,
  max_hr: null,
  resting_hr: null,
  max_speed_ms: null,
  active: true,
  created_at: now,
  updated_at: now,
}));

export const demoTeamMemberships: TeamMembership[] = [
  ...U16_PLAYER_SEEDS.map((p, i) => ({
    id: `membership-u16-${i}`,
    team_id: TEAM_U16_ID,
    player_id: p.id,
    shirt_number: p.shirt,
    positions: p.positions,
    membership_type: "PERMANENT" as const,
    start_date: "2026-08-01",
    end_date: null,
    active: true,
    created_at: now,
  })),
  {
    id: "membership-theo-u19",
    team_id: TEAM_U19_ID,
    player_id: THEO_ID,
    shirt_number: 22,
    positions: ["MIDFIELDER"],
    membership_type: "TEMPORARY",
    start_date: "2026-08-01",
    end_date: null,
    active: true,
    created_at: now,
  },
];

const STARTERS = U16_PLAYER_SEEDS.slice(0, 11);

function buildRoster(matchId: string): MatchRoster[] {
  return U16_PLAYER_SEEDS.map((p, i) => ({
    id: `roster-${matchId}-${i}`,
    match_id: matchId,
    player_id: p.id,
    shirt_number: p.shirt,
    starter: STARTERS.includes(p),
    goalkeeper: p.positions.includes("GOALKEEPER"),
    created_at: now,
  }));
}

const todayPlus3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

export const demoScheduledMatch: Match = {
  id: SCHEDULED_MATCH_ID,
  season_id: DEMO_SEASON_ID,
  team_id: TEAM_U16_ID,
  competition: "Championnat U16",
  match_date: todayPlus3,
  venue: "Terrain Waterloo Ducks",
  opponent_name: "Leopold U16 Boys",
  opponent_logo_url: null,
  home_or_away: "HOME",
  our_score: 0,
  opponent_score: 0,
  status: "SCHEDULED",
  number_of_quarters: 4,
  quarter_duration_minutes: 15,
  current_quarter: 0,
  quarter_started_at: null,
  quarter_paused_at: null,
  quarter_paused_ms_total: 0,
  attacking_directions: null,
  created_at: now,
  updated_at: now,
};

export const demoFinishedMatch: Match = {
  id: FINISHED_MATCH_ID,
  season_id: DEMO_SEASON_ID,
  team_id: TEAM_U16_ID,
  competition: "Championnat U16",
  match_date: twoWeeksAgo,
  venue: "Terrain Dragons HC",
  opponent_name: "Dragons U16 Boys",
  opponent_logo_url: null,
  home_or_away: "AWAY",
  our_score: 3,
  opponent_score: 1,
  status: "FINISHED",
  number_of_quarters: 4,
  quarter_duration_minutes: 15,
  current_quarter: 4,
  quarter_started_at: null,
  quarter_paused_at: null,
  quarter_paused_ms_total: 0,
  attacking_directions: null,
  created_at: now,
  updated_at: now,
};

export const demoMatches: Match[] = [demoScheduledMatch, demoFinishedMatch];

export const demoMatchRosters: Record<string, MatchRoster[]> = {
  [SCHEDULED_MATCH_ID]: buildRoster(SCHEDULED_MATCH_ID),
  [FINISHED_MATCH_ID]: buildRoster(FINISHED_MATCH_ID),
};

const LOUIS_ID = "44444444-4444-4444-4444-444444444410";
const SIMON_ID = "44444444-4444-4444-4444-444444444415";

export const demoPlayerStints: PlayerStint[] = [
  ...STARTERS.filter((p) => p.id !== LOUIS_ID).map((p, i) => ({
    id: `stint-full-${i}`,
    match_id: FINISHED_MATCH_ID,
    player_id: p.id,
    quarter: 1,
    start_match_elapsed_ms: 0,
    end_match_elapsed_ms: 3600000,
    created_at: now,
  })),
  {
    id: "stint-louis",
    match_id: FINISHED_MATCH_ID,
    player_id: LOUIS_ID,
    quarter: 1,
    start_match_elapsed_ms: 0,
    end_match_elapsed_ms: 1800000,
    created_at: now,
  },
  {
    id: "stint-simon",
    match_id: FINISHED_MATCH_ID,
    player_id: SIMON_ID,
    quarter: 3,
    start_match_elapsed_ms: 1800000,
    end_match_elapsed_ms: 3600000,
    created_at: now,
  },
];

const ARTHUR_ID = "44444444-4444-4444-4444-444444444409";

export const demoHockeyEvents: HockeyEvent[] = [
  { id: "evt-1", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: THEO_ID, secondary_player_id: null, possession_id: null, quarter: 1, absolute_timestamp: now, match_elapsed_ms: 95000, quarter_elapsed_ms: 95000, event_category: "TRANSITION", event_type: "BALL_WIN", outcome: "SUCCESS", pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 42, start_y: 38, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-2", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: ARTHUR_ID, secondary_player_id: null, possession_id: null, quarter: 1, absolute_timestamp: now, match_elapsed_ms: 130000, quarter_elapsed_ms: 130000, event_category: "PROGRESSION", event_type: "ENTRY_25", outcome: "SUCCESS", pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 68, start_y: 45, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-3", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: LOUIS_ID, secondary_player_id: null, possession_id: null, quarter: 1, absolute_timestamp: now, match_elapsed_ms: 210000, quarter_elapsed_ms: 210000, event_category: "PROGRESSION", event_type: "CIRCLE_ENTRY", outcome: "SUCCESS", pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 82, start_y: 50, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-4", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: LOUIS_ID, secondary_player_id: null, possession_id: null, quarter: 1, absolute_timestamp: now, match_elapsed_ms: 225000, quarter_elapsed_ms: 225000, event_category: "ATTACK", event_type: "SHOT", outcome: "FAIL", pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 90, start_y: 50, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-5", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: THEO_ID, secondary_player_id: ARTHUR_ID, possession_id: null, quarter: 2, absolute_timestamp: now, match_elapsed_ms: 1050000, quarter_elapsed_ms: 150000, event_category: "ATTACK", event_type: "GOAL", outcome: "SUCCESS", pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 94, start_y: 50, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-6", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: "44444444-4444-4444-4444-444444444411", secondary_player_id: null, possession_id: null, quarter: 2, absolute_timestamp: now, match_elapsed_ms: 1500000, quarter_elapsed_ms: 600000, event_category: "PC", event_type: "PC_WON", outcome: "SUCCESS", pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 91, start_y: 50, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-7", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: THEO_ID, secondary_player_id: null, possession_id: null, quarter: 2, absolute_timestamp: now, match_elapsed_ms: 1512000, quarter_elapsed_ms: 612000, event_category: "PC", event_type: "PC_GOAL", outcome: "SUCCESS", pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 93, start_y: 50, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-8", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: LOUIS_ID, secondary_player_id: null, possession_id: null, quarter: 2, absolute_timestamp: now, match_elapsed_ms: 1800000, quarter_elapsed_ms: 900000, event_category: "SUBSTITUTION", event_type: "PLAYER_OUT", outcome: null, pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: null, start_y: null, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-9", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: SIMON_ID, secondary_player_id: null, possession_id: null, quarter: 3, absolute_timestamp: now, match_elapsed_ms: 1800000, quarter_elapsed_ms: 0, event_category: "SUBSTITUTION", event_type: "PLAYER_IN", outcome: null, pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: null, start_y: null, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-10", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: SIMON_ID, secondary_player_id: ARTHUR_ID, possession_id: null, quarter: 4, absolute_timestamp: now, match_elapsed_ms: 3300000, quarter_elapsed_ms: 600000, event_category: "ATTACK", event_type: "GOAL", outcome: null, pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 96, start_y: 48, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  // A multi-participant example (ADR-003) — three players named via
  // event_participants, not player_id/secondary_player_id.
  { id: "evt-11", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: false, player_id: null, secondary_player_id: null, possession_id: null, quarter: 1, absolute_timestamp: now, match_elapsed_ms: 60000, quarter_elapsed_ms: 60000, event_category: "PRESS", event_type: "PRESS", outcome: null, pressure_context: null, capture_level: "ADVANCED", enrichment_status: "ENRICHED", start_x: 80, start_y: 50, end_x: null, end_y: null, metadata: { pressType: "HIGH_PRESS", pressOutcome: "FORCED_BACKWARD" }, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  // Opponent-side events (spec §16: team-level only, no opponent roster —
  // player_id/secondary_player_id/event_participants stay null/empty).
  { id: "evt-12", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: true, player_id: null, secondary_player_id: null, possession_id: "poss-3", quarter: 3, absolute_timestamp: now, match_elapsed_ms: 2000000, quarter_elapsed_ms: 200000, event_category: "TRANSITION", event_type: "BALL_WIN", outcome: null, pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 55, start_y: 45, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-13", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: true, player_id: null, secondary_player_id: null, possession_id: "poss-3", quarter: 3, absolute_timestamp: now, match_elapsed_ms: 2015000, quarter_elapsed_ms: 215000, event_category: "PROGRESSION", event_type: "ENTRY_25", outcome: null, pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 20, start_y: 40, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
  { id: "evt-14", match_id: FINISHED_MATCH_ID, team_id: TEAM_U16_ID, is_opponent: true, player_id: null, secondary_player_id: null, possession_id: "poss-3", quarter: 3, absolute_timestamp: now, match_elapsed_ms: 2025000, quarter_elapsed_ms: 225000, event_category: "ATTACK", event_type: "SHOT", outcome: "FAIL", pressure_context: null, capture_level: "STANDARD", enrichment_status: "RAW", start_x: 8, start_y: 48, end_x: null, end_y: null, metadata: {}, video_id: null, video_timestamp_ms: null, deleted_at: null, created_by: null, created_at: now, updated_at: now },
];

export const demoEventParticipants: EventParticipant[] = [
  { id: "part-1", event_id: "evt-11", player_id: THEO_ID, role: "PRESSER", order_index: 0, metadata: {}, created_at: now },
  { id: "part-2", event_id: "evt-11", player_id: ARTHUR_ID, role: "PRESS_SUPPORT", order_index: 1, metadata: {}, created_at: now },
  { id: "part-3", event_id: "evt-11", player_id: LOUIS_ID, role: "PRESS_SUPPORT", order_index: 2, metadata: {}, created_at: now },
];

// Two materialized possessions (ADR-003) spanning the demo events above —
// p1 covers evt-1..evt-4 (Ball Win -> Entry 25 -> Circle Entry -> Shot),
// p2 covers evt-5 (Goal) — enough for a non-trivial conversion funnel demo.
export const demoPossessions: Possession[] = [
  {
    id: "poss-1",
    match_id: FINISHED_MATCH_ID,
    team_id: TEAM_U16_ID,
    is_opponent: false,
    quarter: 1,
    start_timestamp: now,
    end_timestamp: now,
    start_match_elapsed_ms: 90000,
    end_match_elapsed_ms: 230000,
    start_x: 42,
    start_y: 38,
    end_x: 90,
    end_y: 50,
    possession_start_type: "BALL_RECOVERY",
    attack_type: "ESTABLISHED_ATTACK",
    tactical_context: null,
    outcome: "POSITIVE",
    metadata: {},
    created_at: now,
    updated_at: now,
  },
  {
    id: "poss-2",
    match_id: FINISHED_MATCH_ID,
    team_id: TEAM_U16_ID,
    quarter: 2,
    is_opponent: false,
    start_timestamp: now,
    end_timestamp: now,
    start_match_elapsed_ms: 1040000,
    end_match_elapsed_ms: 1060000,
    start_x: 88,
    start_y: 50,
    end_x: 94,
    end_y: 50,
    possession_start_type: "OPPONENT_TURNOVER",
    attack_type: "COUNTER_ATTACK",
    tactical_context: null,
    outcome: "POSITIVE",
    metadata: {},
    created_at: now,
    updated_at: now,
  },
  // Opponent possession (spans evt-12..evt-14 above) — feeds the defensive funnel/heatmap.
  {
    id: "poss-3",
    match_id: FINISHED_MATCH_ID,
    team_id: TEAM_U16_ID,
    is_opponent: true,
    quarter: 3,
    start_timestamp: now,
    end_timestamp: now,
    start_match_elapsed_ms: 2000000,
    end_match_elapsed_ms: 2030000,
    start_x: 55,
    start_y: 45,
    end_x: 8,
    end_y: 48,
    possession_start_type: "BALL_RECOVERY",
    attack_type: "ESTABLISHED_ATTACK",
    tactical_context: null,
    outcome: "NEGATIVE",
    metadata: {},
    created_at: now,
    updated_at: now,
  },
];
