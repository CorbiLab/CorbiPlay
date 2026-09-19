/**
 * Hand-written to match supabase/migrations/0001_init.sql exactly.
 * Once a real Supabase project exists, replace this file with the output of:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 * (and re-apply the `Database` export shape below if the generator differs).
 */

export type UserRole =
  | "ADMIN"
  | "CLUB_ADMIN"
  | "HEAD_OF_HOCKEY"
  | "PERFORMANCE_DIRECTOR"
  | "HEAD_COACH"
  | "ASSISTANT_COACH"
  | "ANALYST"
  | "PHYSICAL_COACH"
  | "MEDICAL"
  | "TEAM_MANAGER"
  | "PLAYER";

export type MembershipType = "PERMANENT" | "TEMPORARY" | "GUEST" | "TRAINING_ONLY";
export type MatchStatus = "SCHEDULED" | "WARMUP" | "LIVE" | "BREAK" | "FINISHED";
export type HomeAway = "HOME" | "AWAY";
export type EventCategory =
  | "POSSESSION"
  | "TRANSITION"
  | "PROGRESSION"
  | "ATTACK"
  | "PC"
  | "DEFENCE"
  | "DISCIPLINE"
  | "SUBSTITUTION"
  | "PRESS";
export type EventType =
  | "POSSESSION_START"
  | "POSSESSION_END"
  | "BALL_WIN"
  | "TURNOVER"
  | "COUNTER_ATTACK"
  | "DEFENSIVE_EXIT"
  | "TRANSFER"
  | "AERIAL"
  | "ENTRY_25"
  | "CIRCLE_ENTRY"
  | "KEY_PASS"
  | "SHOT"
  | "CHANCE"
  | "GOAL"
  | "ASSIST"
  | "PRESS"
  | "PC_WON"
  | "PC_PLAYED"
  | "PC_SHOT"
  | "PC_GOAL"
  | "INTERCEPTION"
  | "TACKLE"
  | "DEFLECTION"
  | "FOUL"
  | "GREEN_CARD"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "PLAYER_IN"
  | "PLAYER_OUT";
export type EventOutcome = "SUCCESS" | "FAIL" | "NEUTRAL";
export type TrainingSessionType =
  | "RECOVERY"
  | "TECHNICAL"
  | "TACTICAL"
  | "CONDITIONING"
  | "GYM"
  | "MATCH_PREP"
  | "OTHER";
export type AttendanceStatus = "PLANNED" | "PRESENT" | "ABSENT" | "INJURED" | "REHAB" | "MODIFIED";
export type ExternalProvider = "STATSPORTS" | "GARMIN" | "CATAPULT" | "POLAR" | "OTHER";
export type SportingSessionKind = "MATCH" | "TRAINING";
export type PlayerPosition = "GOALKEEPER" | "DEFENDER" | "MIDFIELDER" | "FORWARD";

export interface Club {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  country: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  club_id: string;
  name: string;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  club_id: string;
  season_id: string;
  name: string;
  short_name: string | null;
  age_category: string | null;
  gender: string | null;
  level: string | null;
  logo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  birth_date: string | null;
  photo_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  max_hr: number | null;
  resting_hr: number | null;
  max_speed_ms: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  player_id: string;
  shirt_number: number | null;
  positions: PlayerPosition[];
  membership_type: MembershipType;
  start_date: string;
  end_date: string | null;
  active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  club_id: string | null;
  display_name: string | null;
  email: string | null;
  created_at: string;
}

export interface StaffAccess {
  id: string;
  user_id: string;
  club_id: string;
  team_id: string | null;
  role: UserRole;
  created_at: string;
}

/**
 * The shared identity behind Match/TrainingSession — see ADR-001 in
 * docs/ARCHITECTURE.md. `Match.id` and `TrainingSession.id` ARE
 * `SportingSession.id` (same UUID); the app never inserts/updates/deletes
 * this table directly — a DB trigger maintains it whenever a match or
 * training session is written.
 */
export interface SportingSession {
  id: string;
  team_id: string;
  kind: SportingSessionKind;
  session_date: string;
  start_timestamp: string | null;
  end_timestamp: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  season_id: string;
  team_id: string;
  competition: string | null;
  match_date: string;
  venue: string | null;
  opponent_name: string;
  opponent_logo_url: string | null;
  home_or_away: HomeAway;
  our_score: number;
  opponent_score: number;
  status: MatchStatus;
  number_of_quarters: number;
  quarter_duration_minutes: number;
  current_quarter: number;
  quarter_started_at: string | null;
  quarter_paused_at: string | null;
  quarter_paused_ms_total: number;
  /** Map of quarter number -> attacking direction, e.g. `{ "1": "LEFT_TO_RIGHT" }`. Not yet read anywhere (Sprint 2). */
  attacking_directions: Record<string, "LEFT_TO_RIGHT" | "RIGHT_TO_LEFT"> | null;
  /** Link to the match recording (YouTube/Veo/Drive/...) — a URL only, no stored file. */
  video_url: string | null;
  /** Map of quarter number -> ms into the video where that quarter's clock hit 00:00, e.g. `{ "1": 120000 }`. See modules/matches/logic/video.ts. */
  video_quarter_offsets_ms: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface MatchRoster {
  id: string;
  match_id: string;
  player_id: string;
  shirt_number: number | null;
  starter: boolean;
  goalkeeper: boolean;
  created_at: string;
}

export interface PlayerStint {
  id: string;
  match_id: string;
  player_id: string;
  quarter: number;
  start_match_elapsed_ms: number;
  end_match_elapsed_ms: number | null;
  created_at: string;
}

export interface HockeyEvent {
  id: string;
  match_id: string;
  team_id: string;
  /** team_id is always OUR team — this is the real "for us / for them" flag (spec §16: opponent is team-level only, no roster). */
  is_opponent: boolean;
  player_id: string | null;
  secondary_player_id: string | null;
  /** Nullable — not yet populated by any write path (see docs/HOCKEY_ANALYTICS.md). */
  possession_id: string | null;
  quarter: number;
  absolute_timestamp: string;
  match_elapsed_ms: number;
  quarter_elapsed_ms: number;
  event_category: EventCategory;
  event_type: EventType;
  outcome: EventOutcome | null;
  /** Freeform, optional — never required during live encoding. See PressureContext for suggested values. */
  pressure_context: string | null;
  /** How much detail the analyst was asked for when this row was created (ADR-003) — "BASIC" | "STANDARD" | "ADVANCED". */
  capture_level: string;
  /** "RAW" | "PARTIAL" | "ENRICHED" | "REVIEWED" — bumped by patchEvent/addEventParticipants, never by hand elsewhere. */
  enrichment_status: string;
  start_x: number | null;
  start_y: number | null;
  end_x: number | null;
  end_y: number | null;
  metadata: Record<string, unknown>;
  video_id: string | null;
  video_timestamp_ms: number | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One player's involvement in a HockeyEvent that involves more than one
 * (PRESS today; future PC units) — see ADR-003. `hockey_events.player_id`
 * remains the fast-path single-player shortcut for every other event type;
 * this table is additive, not a replacement for it.
 */
export interface EventParticipant {
  id: string;
  event_id: string;
  player_id: string;
  /** Freeform, suggested values in tactical-vocabulary.ts (PRESSER, PRESS_SUPPORT, ...). */
  role: string;
  order_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * A continuous period of team control/progression grouping several
 * HockeyEvents (spec's "sequence"). The classification columns below are
 * `string | null`, not string-literal unions: this vocabulary is meant to
 * differ per club/coach (docs/HOCKEY_ANALYTICS.md), so the suggested-value
 * arrays exported alongside this type (e.g. SUGGESTED_ATTACK_TYPES) are
 * defaults for a picker, never an exhaustive/enforced set.
 */
export interface Possession {
  id: string;
  match_id: string;
  team_id: string;
  /** Same reasoning as HockeyEvent.is_opponent — team_id stays ours, this is the real flag. */
  is_opponent: boolean;
  quarter: number;
  start_timestamp: string | null;
  end_timestamp: string | null;
  start_match_elapsed_ms: number;
  end_match_elapsed_ms: number | null;
  start_x: number | null;
  start_y: number | null;
  end_x: number | null;
  end_y: number | null;
  possession_start_type: string | null;
  attack_type: string | null;
  tactical_context: string | null;
  /** Sequence-level outcome (POSITIVE/NEUTRAL/NEGATIVE by default) — distinct from HockeyEvent.outcome, which is per-event. */
  outcome: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Schema-ready, unused by any UI yet (Sprint 2+) — see docs/HOCKEY_ANALYTICS.md §KPI architecture. */
export interface KpiDefinition {
  id: string;
  club_id: string | null;
  team_id: string | null;
  key: string;
  label: string;
  description: string | null;
  category: string | null;
  calculation_type: string;
  configuration: Record<string, unknown>;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Schema-ready, unused by any UI yet (Sprint 2+) — see docs/HOCKEY_ANALYTICS.md §Team game model. */
export interface TeamGameModel {
  team_id: string;
  config: Record<string, unknown>;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  team_id: string;
  date: string;
  // start_timestamp/end_timestamp live on SportingSession now — see ADR-001.
  session_type: TrainingSessionType;
  title: string | null;
  description: string | null;
  planned_load: number | null;
  status: string;
  created_at: string;
}

export interface TrainingAttendance {
  id: string;
  training_session_id: string;
  player_id: string;
  status: AttendanceStatus;
  participation_percentage: number | null;
  notes: string | null;
}

export interface PhysicalSession {
  id: string;
  team_id: string;
  sporting_session_id: string; // ADR-001 — regardless of match or training
  provider: ExternalProvider | null;
  start_timestamp: string | null;
  end_timestamp: string | null;
  source_type: string | null;
  source_file_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AthletePhysicalSession {
  id: string;
  physical_session_id: string;
  player_id: string;
  duration_s: number | null;
  time_on_pitch_s: number | null;
  total_distance_m: number | null;
  distance_per_min: number | null;
  max_speed_ms: number | null;
  high_speed_distance_m: number | null;
  high_speed_distance_per_min: number | null;
  sprint_distance_m: number | null;
  sprint_count: number | null;
  accelerations: number | null;
  decelerations: number | null;
  high_intensity_accelerations: number | null;
  high_intensity_decelerations: number | null;
  mechanical_load: number | null;
  mechanical_load_per_min: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  hr_zone_1_s: number | null;
  hr_zone_2_s: number | null;
  hr_zone_3_s: number | null;
  hr_zone_4_s: number | null;
  hr_zone_5_s: number | null;
  rpe: number | null;
  created_at: string;
}

export interface PerformanceMetric {
  id: string;
  athlete_physical_session_id: string;
  provider: ExternalProvider | null;
  metric_key: string;
  metric_label: string | null;
  value: number | null;
  unit: string | null;
  threshold: number | null;
  metadata: Record<string, unknown>;
}

export interface ExternalAthleteIdentity {
  id: string;
  player_id: string;
  provider: ExternalProvider;
  external_id: string;
  external_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SpeedZoneDefinition {
  id: string;
  club_id: string | null;
  team_id: string | null;
  player_id: string | null;
  name: string;
  min_speed_ms: number | null;
  max_speed_ms: number | null;
  is_relative: boolean;
  relative_percent_of_max: number | null;
  created_at: string;
}

export interface HrZoneDefinition {
  id: string;
  club_id: string | null;
  team_id: string | null;
  player_id: string | null;
  name: string;
  min_bpm: number | null;
  max_bpm: number | null;
  is_relative: boolean;
  relative_percent_of_max: number | null;
  created_at: string;
}

export interface AthleteDailyMetric {
  id: string;
  player_id: string;
  date: string;
  provider: ExternalProvider | null;
  resting_hr: number | null;
  sleep_duration_min: number | null;
  sleep_score: number | null;
  stress: number | null;
  recovery_metric: number | null;
  body_battery: number | null;
  hrv_metric: number | null;
  metadata: Record<string, unknown>;
}

export interface WellnessEntry {
  id: string;
  player_id: string;
  date: string;
  sleep_quality: number | null;
  fatigue: number | null;
  muscle_soreness: number | null;
  stress: number | null;
  motivation: number | null;
  pain_flag: boolean;
  notes: string | null;
  created_at: string;
}

export interface SessionRpeEntry {
  id: string;
  player_id: string;
  sporting_session_id: string; // ADR-001 — regardless of match or training
  duration_min: number;
  rpe: number;
  session_load: number;
  created_at: string;
}

export interface AthleteMatchReference {
  id: string;
  player_id: string;
  label: string;
  source_strategy: string;
  reference_athlete_physical_session_id: string | null;
  total_distance_m: number | null;
  high_speed_distance_m: number | null;
  sprint_distance_m: number | null;
  accelerations: number | null;
  decelerations: number | null;
  mechanical_load: number | null;
  created_at: string;
}
