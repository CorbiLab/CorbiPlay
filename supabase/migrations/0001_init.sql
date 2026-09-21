-- Hockey Trace — initial schema
-- See docs/DATA_MODEL.md for the reasoning behind every table/relationship,
-- and docs/PERMISSIONS.md for the RLS design this migration implements.

create extension if not exists pgcrypto;
create schema if not exists app;

-- =========================================================================
-- ENUMS
-- =========================================================================

create type user_role as enum (
  'ADMIN', 'CLUB_ADMIN', 'HEAD_OF_HOCKEY', 'PERFORMANCE_DIRECTOR',
  'HEAD_COACH', 'ASSISTANT_COACH', 'ANALYST', 'PHYSICAL_COACH', 'MEDICAL',
  'TEAM_MANAGER', 'PLAYER'
);

create type membership_type as enum ('PERMANENT', 'TEMPORARY', 'GUEST', 'TRAINING_ONLY');
create type match_status as enum ('SCHEDULED', 'WARMUP', 'LIVE', 'BREAK', 'FINISHED');
create type home_away as enum ('HOME', 'AWAY');
create type event_category as enum (
  'POSSESSION', 'TRANSITION', 'PROGRESSION', 'ATTACK', 'PC', 'DEFENCE',
  'DISCIPLINE', 'SUBSTITUTION', 'PRESS'
);
create type event_type as enum (
  'POSSESSION_START', 'POSSESSION_END',
  'BALL_WIN', 'TURNOVER', 'COUNTER_ATTACK',
  'DEFENSIVE_EXIT', 'TRANSFER', 'AERIAL', 'ENTRY_25', 'CIRCLE_ENTRY', 'KEY_PASS',
  'SHOT', 'CHANCE', 'GOAL', 'ASSIST',
  'PRESS',
  'PC_WON', 'PC_PLAYED', 'PC_SHOT', 'PC_GOAL',
  'INTERCEPTION', 'TACKLE', 'DEFLECTION',
  'FOUL', 'GREEN_CARD', 'YELLOW_CARD', 'RED_CARD',
  'PLAYER_IN', 'PLAYER_OUT'
);
create type event_outcome as enum ('SUCCESS', 'FAIL', 'NEUTRAL');
create type training_session_type as enum (
  'RECOVERY', 'TECHNICAL', 'TACTICAL', 'CONDITIONING', 'GYM', 'MATCH_PREP', 'OTHER'
);
create type attendance_status as enum ('PLANNED', 'PRESENT', 'ABSENT', 'INJURED', 'REHAB', 'MODIFIED');
create type external_provider as enum ('STATSPORTS', 'GARMIN', 'CATAPULT', 'POLAR', 'OTHER');
create type sporting_session_kind as enum ('MATCH', 'TRAINING');

-- =========================================================================
-- CORE: CLUB / SEASON / TEAM / PLAYER
-- =========================================================================

create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  logo_url text,
  country text,
  primary_color text,
  secondary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (club_id, name)
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  short_name text,
  age_category text,
  gender text,
  level text,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teams_club_idx on teams(club_id);
create index teams_season_idx on teams(season_id);

-- Player is the permanent athlete identity. Deliberately NO team_id column —
-- see docs/DATA_MODEL.md "Critical rules and how the schema enforces them".
create table players (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  display_name text,
  birth_date date,
  photo_url text,
  height_cm numeric,
  weight_kg numeric,
  max_hr integer,
  resting_hr integer,
  max_speed_ms numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index players_club_idx on players(club_id);

create table team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  shirt_number integer,
  positions text[] not null default '{}',
  membership_type membership_type not null default 'PERMANENT',
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index team_memberships_team_idx on team_memberships(team_id);
create index team_memberships_player_idx on team_memberships(player_id);

-- =========================================================================
-- IDENTITY / ACCESS
-- =========================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid references clubs(id) on delete set null,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

create table staff_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, club_id, team_id, role)
);
create index staff_access_user_idx on staff_access(user_id);

-- Auto-create a (club-less) profile row whenever a new Supabase Auth user is
-- created, so app code never has to special-case "profile missing".
create function app.handle_new_auth_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();

-- =========================================================================
-- SPORTING SESSION — shared identity for Match / Training
-- See docs/ARCHITECTURE.md ADR-001. matches.id and training_sessions.id ARE
-- sporting_sessions.id (same UUID, populated transparently by trigger below)
-- — nothing that already references matches(id)/training_sessions(id)
-- directly (match_rosters, training_attendance, hockey_events, player_stints,
-- possessions) changes at all. Only physical_sessions/session_rpe_entries —
-- the tables that need to work "regardless of match or training" — reference
-- this table instead of a match_id/training_session_id XOR.
-- =========================================================================

create table sporting_sessions (
  id uuid primary key,
  team_id uuid not null references teams(id) on delete cascade,
  kind sporting_session_kind not null,
  session_date date not null,
  start_timestamp timestamptz,
  end_timestamp timestamptz,
  created_at timestamptz not null default now()
);
create index sporting_sessions_team_idx on sporting_sessions(team_id);
create index sporting_sessions_date_idx on sporting_sessions(session_date);

-- =========================================================================
-- MATCH
-- =========================================================================

create table matches (
  id uuid primary key default gen_random_uuid() references sporting_sessions(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  competition text,
  match_date date not null,
  venue text,
  opponent_name text not null,
  opponent_logo_url text,
  home_or_away home_away not null default 'HOME',
  our_score integer not null default 0,
  opponent_score integer not null default 0,
  status match_status not null default 'SCHEDULED',
  number_of_quarters integer not null default 4,
  quarter_duration_minutes integer not null default 15,
  current_quarter integer not null default 0,
  -- Match clock anchor (see docs/ARCHITECTURE.md "Match clock"): the clock is
  -- reconstructed from these timestamps, never trusted from a client interval.
  quarter_started_at timestamptz,
  quarter_paused_at timestamptz,
  quarter_paused_ms_total bigint not null default 0,
  -- Nullable map of quarter number -> "LEFT_TO_RIGHT" | "RIGHT_TO_LEFT" (spec
  -- §20: teams can switch ends between quarters, and every spatial analytic —
  -- high ball win, defensive turnover, progression — needs to know which way
  -- is "forward" for a given event). Absent until Sprint 2 actually reads it.
  attacking_directions jsonb,
  -- A link to wherever the match recording actually lives (YouTube, Veo,
  -- a club Drive, ...) — deliberately just a URL, not a stored file: no
  -- storage cost/provider decision needed for this (see docs/INTEGRATIONS.md
  -- "Video (Sprint 7)", which is about per-event video linking and is a
  -- separate, heavier decision this doesn't block on).
  video_url text,
  -- Map of quarter number -> how far into that video (ms) this quarter's
  -- clock hit 00:00 — one entry per quarter that's been set, absent
  -- otherwise. Needed because match_elapsed_ms is a *nominal* clock (each
  -- quarter counted as exactly quarter_duration_minutes long, breaks not
  -- represented at all — see getMatchElapsedMs in modules/matches/logic/
  -- clock.ts) while a single-file recording keeps rolling through halftime,
  -- so one fixed offset for the whole match would drift by however long the
  -- real break ran. quarter + quarter_elapsed_ms (not match_elapsed_ms)
  -- is what a video timestamp is computed from.
  video_quarter_offsets_ms jsonb not null default '{}'::jsonb,
  -- The analyst's own pick of event types for this match's live-encoding grid,
  -- used only while the (purely local, unpersisted) encoding level switch is
  -- set to CUSTOM — a plain array of hockey_events.event_type values, e.g.
  -- '["GOAL","TACKLE"]'. Per-match, not per-team, since the same team can be
  -- encoded solo one week and by two analysts the next. Empty/absent means
  -- "not configured yet," not "show everything."
  custom_encoding_types jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index matches_team_idx on matches(team_id);
create index matches_season_idx on matches(season_id);

-- Transparently maintains the shared sporting_sessions identity — application
-- code (createMatch, etc.) only ever inserts/updates/deletes `matches`.
create function app.create_match_sporting_session() returns trigger
  language plpgsql as $$
begin
  insert into sporting_sessions (id, team_id, kind, session_date)
  values (new.id, new.team_id, 'MATCH', new.match_date);
  return new;
end;
$$;
create trigger matches_before_insert_sporting_session
  before insert on matches
  for each row execute function app.create_match_sporting_session();

create function app.sync_match_sporting_session() returns trigger
  language plpgsql as $$
begin
  update sporting_sessions set team_id = new.team_id, session_date = new.match_date where id = new.id;
  return new;
end;
$$;
create trigger matches_after_update_sporting_session
  after update on matches
  for each row execute function app.sync_match_sporting_session();

create function app.delete_match_sporting_session() returns trigger
  language plpgsql as $$
begin
  delete from sporting_sessions where id = old.id;
  return old;
end;
$$;
create trigger matches_after_delete_sporting_session
  after delete on matches
  for each row execute function app.delete_match_sporting_session();

create table match_rosters (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  shirt_number integer,
  starter boolean not null default false,
  goalkeeper boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);
create index match_rosters_match_idx on match_rosters(match_id);

create table player_stints (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  quarter integer not null,
  start_match_elapsed_ms bigint not null,
  end_match_elapsed_ms bigint,
  created_at timestamptz not null default now()
);
create index player_stints_match_idx on player_stints(match_id);
create index player_stints_player_idx on player_stints(player_id);

-- Source of truth for all match analytics. See docs/ARCHITECTURE.md
-- "Event sourcing, pragmatically" for how derived stats are computed.
-- possessions is created before hockey_events references it (spec: "Every
-- HockeyEvent should be able to reference a possession_id nullable"). Its
-- classification columns (attack_type, tactical_context, outcome,
-- possession_start_type) are deliberately `text`, not enums: this vocabulary
-- differs by club/coach and must stay editable without a migration — see
-- docs/HOCKEY_ANALYTICS.md and ADR-002 in docs/ARCHITECTURE.md. duration_ms
-- is NOT stored — it's always (end_match_elapsed_ms - start_match_elapsed_ms),
-- computed on read (getSequenceDuration in analytics/logic/sequences.ts).
create table possessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  -- team_id is always OUR team (the only real FK target — the opponent has
  -- no team row, by design: spec §16, "opponent is represented primarily as
  -- a TEAM," not a full roster/entity). is_opponent is the actual "whose
  -- possession is this" flag; team_id stays constant either way.
  is_opponent boolean not null default false,
  quarter integer not null,
  start_timestamp timestamptz,
  end_timestamp timestamptz,
  start_match_elapsed_ms bigint not null,
  end_match_elapsed_ms bigint,
  start_x numeric,
  start_y numeric,
  end_x numeric,
  end_y numeric,
  possession_start_type text,
  attack_type text,
  tactical_context text,
  outcome text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index possessions_match_idx on possessions(match_id);

create table hockey_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  -- Same reasoning as possessions.is_opponent above — team_id is always ours;
  -- this is the actual team-level "for us / for them" flag (spec §16). An
  -- opponent-tagged event never carries player_id/secondary_player_id/
  -- event_participants (no opponent roster exists) — enforced in the live
  -- store, not the DB.
  is_opponent boolean not null default false,
  player_id uuid references players(id) on delete set null,
  secondary_player_id uuid references players(id) on delete set null,
  possession_id uuid references possessions(id) on delete set null,
  quarter integer not null,
  absolute_timestamp timestamptz not null default now(),
  match_elapsed_ms bigint not null,
  quarter_elapsed_ms bigint not null,
  event_category event_category not null,
  event_type event_type not null,
  outcome event_outcome,
  -- pressure_context is optional and freeform for the same reason as the
  -- possession classification columns above — never required during live
  -- encoding (spec §13/§42), filled in later if at all.
  pressure_context text,
  -- Encoding-level readiness (ADR-003): capture_level records how much detail
  -- the analyst was asked for when this row was created — distinguishes "not
  -- collected" from "doesn't apply". enrichment_status tracks whether a BASIC
  -- row has since been enriched (same event id, never duplicated — see
  -- patchEvent/addEventParticipants).
  capture_level text not null default 'STANDARD',
  enrichment_status text not null default 'RAW',
  start_x numeric,
  start_y numeric,
  end_x numeric,
  end_y numeric,
  metadata jsonb not null default '{}'::jsonb,
  video_id uuid,
  video_timestamp_ms bigint,
  deleted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hockey_events_match_idx on hockey_events(match_id);
create index hockey_events_player_idx on hockey_events(player_id);
create index hockey_events_type_idx on hockey_events(event_type);
create index hockey_events_possession_idx on hockey_events(possession_id);

-- A HockeyEvent can involve more than one player (PRESS, future PC units) —
-- see ADR-003 for why this is a separate table rather than player_id/
-- secondary_player_id/third_player_id columns. `hockey_events.player_id`
-- stays as the fast-path single-player shortcut for the common case; this
-- table is additive, never a replacement for it.
create table event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references hockey_events(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  role text not null,
  order_index integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index event_participants_event_idx on event_participants(event_id);
create index event_participants_player_idx on event_participants(player_id);

-- =========================================================================
-- TACTICAL ANALYTICS CONFIGURATION (schema readiness only — spec §8/§29:
-- no editor UI, no calculation engine yet, both are Sprint 2+. Rows are
-- club/team-scoped config, never app code, so a coach's vocabulary or a
-- dashboard's pinned KPIs never require a migration to change.)
-- =========================================================================

-- One row per team holding whatever tactical/game-model config that team
-- has configured (preferred KPIs, tactical context labels in use, event
-- visibility, thresholds...). Shape is intentionally not modeled in SQL —
-- `config` is the whole thing, versioned by whoever reads it.
create table team_game_models (
  team_id uuid primary key references teams(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- A safe, declarative KPI: `calculation_type` names one of a fixed set of
-- predefined calculators the app knows how to run (never arbitrary code),
-- and `configuration` supplies that calculator's parameters — e.g. for
-- calculation_type 'sequence_reach_rate':
--   {"startEvent": "BALL_WIN", "startZone": "ATTACKING_HALF", "targetEvent": "SHOT", "samePossession": true}
-- club_id/team_id are both nullable and both optional: null club_id + null
-- team_id is an app-wide default KPI; a team_id row overrides it for that
-- team only.
create table kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  key text not null,
  label text not null,
  description text,
  category text,
  calculation_type text not null,
  configuration jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index kpi_definitions_club_idx on kpi_definitions(club_id);
create index kpi_definitions_team_idx on kpi_definitions(team_id);

-- =========================================================================
-- TRAINING
-- =========================================================================

create table training_sessions (
  id uuid primary key default gen_random_uuid() references sporting_sessions(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  date date not null,
  -- start_timestamp/end_timestamp live on sporting_sessions now (shared with
  -- matches) — one wall-clock span per session for GPS/HR/video alignment
  -- (spec §61), regardless of session kind.
  session_type training_session_type not null default 'TECHNICAL',
  title text,
  description text,
  planned_load numeric,
  status text not null default 'PLANNED',
  created_at timestamptz not null default now()
);
create index training_sessions_team_idx on training_sessions(team_id);

create function app.create_training_sporting_session() returns trigger
  language plpgsql as $$
begin
  insert into sporting_sessions (id, team_id, kind, session_date)
  values (new.id, new.team_id, 'TRAINING', new.date);
  return new;
end;
$$;
create trigger training_sessions_before_insert_sporting_session
  before insert on training_sessions
  for each row execute function app.create_training_sporting_session();

create function app.sync_training_sporting_session() returns trigger
  language plpgsql as $$
begin
  update sporting_sessions set team_id = new.team_id, session_date = new.date where id = new.id;
  return new;
end;
$$;
create trigger training_sessions_after_update_sporting_session
  after update on training_sessions
  for each row execute function app.sync_training_sporting_session();

create function app.delete_training_sporting_session() returns trigger
  language plpgsql as $$
begin
  delete from sporting_sessions where id = old.id;
  return old;
end;
$$;
create trigger training_sessions_after_delete_sporting_session
  after delete on training_sessions
  for each row execute function app.delete_training_sporting_session();

create table training_attendance (
  id uuid primary key default gen_random_uuid(),
  training_session_id uuid not null references training_sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  status attendance_status not null default 'PLANNED',
  participation_percentage numeric,
  notes text,
  unique (training_session_id, player_id)
);
create index training_attendance_session_idx on training_attendance(training_session_id);
create index training_attendance_player_idx on training_attendance(player_id);

-- =========================================================================
-- PHYSICAL / SENSOR DATA (schema ready ahead of Sprint 3, per spec §86)
-- =========================================================================

create table physical_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  -- ADR-001 (docs/ARCHITECTURE.md): one FK to the shared sporting_sessions
  -- identity instead of a match_id/training_session_id XOR — this table (and
  -- session_rpe_entries below) is exactly the "regardless of match or
  -- training" case the ADR exists for.
  sporting_session_id uuid not null references sporting_sessions(id) on delete cascade,
  provider external_provider,
  start_timestamp timestamptz,
  end_timestamp timestamptz,
  source_type text,
  source_file_name text,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index physical_sessions_team_idx on physical_sessions(team_id);
create index physical_sessions_sporting_session_idx on physical_sessions(sporting_session_id);

create table athlete_physical_sessions (
  id uuid primary key default gen_random_uuid(),
  physical_session_id uuid not null references physical_sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  duration_s integer,
  time_on_pitch_s integer,
  total_distance_m numeric,
  distance_per_min numeric,
  max_speed_ms numeric,
  high_speed_distance_m numeric,
  high_speed_distance_per_min numeric,
  sprint_distance_m numeric,
  sprint_count integer,
  accelerations integer,
  decelerations integer,
  high_intensity_accelerations integer,
  high_intensity_decelerations integer,
  mechanical_load numeric,
  mechanical_load_per_min numeric,
  avg_hr integer,
  max_hr integer,
  hr_zone_1_s integer,
  hr_zone_2_s integer,
  hr_zone_3_s integer,
  hr_zone_4_s integer,
  hr_zone_5_s integer,
  rpe numeric,
  created_at timestamptz not null default now(),
  unique (physical_session_id, player_id)
);
create index athlete_physical_sessions_player_idx on athlete_physical_sessions(player_id);

create table performance_metrics (
  id uuid primary key default gen_random_uuid(),
  athlete_physical_session_id uuid not null references athlete_physical_sessions(id) on delete cascade,
  provider external_provider,
  metric_key text not null,
  metric_label text,
  value numeric,
  unit text,
  threshold numeric,
  metadata jsonb not null default '{}'::jsonb
);
create index performance_metrics_session_idx on performance_metrics(athlete_physical_session_id);

create table external_athlete_identities (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  provider external_provider not null,
  external_id text not null,
  external_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, player_id),
  unique (provider, external_id)
);

create table speed_zone_definitions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  name text not null,
  min_speed_ms numeric,
  max_speed_ms numeric,
  is_relative boolean not null default false,
  relative_percent_of_max numeric,
  created_at timestamptz not null default now(),
  constraint speed_zone_one_scope check (
    (club_id is not null)::int + (team_id is not null)::int + (player_id is not null)::int = 1
  )
);

create table hr_zone_definitions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  name text not null,
  min_bpm integer,
  max_bpm integer,
  is_relative boolean not null default false,
  relative_percent_of_max numeric,
  created_at timestamptz not null default now(),
  constraint hr_zone_one_scope check (
    (club_id is not null)::int + (team_id is not null)::int + (player_id is not null)::int = 1
  )
);

-- =========================================================================
-- LOAD / RECOVERY (schema ready ahead of Sprint 4/5)
-- =========================================================================

create table athlete_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  date date not null,
  provider external_provider,
  resting_hr integer,
  sleep_duration_min integer,
  sleep_score integer,
  stress integer,
  recovery_metric numeric,
  body_battery integer,
  hrv_metric numeric,
  metadata jsonb not null default '{}'::jsonb,
  unique (player_id, date, provider)
);
create index athlete_daily_metrics_player_idx on athlete_daily_metrics(player_id);

create table wellness_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  date date not null,
  sleep_quality integer,
  fatigue integer,
  muscle_soreness integer,
  stress integer,
  motivation integer,
  pain_flag boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (player_id, date)
);
create index wellness_entries_player_idx on wellness_entries(player_id);

create table session_rpe_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  sporting_session_id uuid not null references sporting_sessions(id) on delete cascade,
  duration_min numeric not null,
  rpe numeric not null check (rpe >= 0 and rpe <= 10),
  session_load numeric generated always as (duration_min * rpe) stored,
  created_at timestamptz not null default now(),
  -- One RPE per athlete per session (Session-RPE method) — added for Sprint 4
  -- so the entry form can upsert instead of needing a select-then-branch.
  unique (player_id, sporting_session_id)
);
create index session_rpe_entries_player_idx on session_rpe_entries(player_id);
create index session_rpe_entries_session_idx on session_rpe_entries(sporting_session_id);

create table athlete_match_references (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  label text not null default 'DEFAULT',
  source_strategy text not null default 'SINGLE_MATCH',
  reference_athlete_physical_session_id uuid references athlete_physical_sessions(id) on delete set null,
  total_distance_m numeric,
  high_speed_distance_m numeric,
  sprint_distance_m numeric,
  accelerations integer,
  decelerations integer,
  mechanical_load numeric,
  created_at timestamptz not null default now()
);
create index athlete_match_references_player_idx on athlete_match_references(player_id);

-- =========================================================================
-- updated_at triggers
-- =========================================================================

create function app.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clubs_set_updated_at before update on clubs
  for each row execute function app.set_updated_at();
create trigger teams_set_updated_at before update on teams
  for each row execute function app.set_updated_at();
create trigger players_set_updated_at before update on players
  for each row execute function app.set_updated_at();
create trigger matches_set_updated_at before update on matches
  for each row execute function app.set_updated_at();
create trigger hockey_events_set_updated_at before update on hockey_events
  for each row execute function app.set_updated_at();
create trigger physical_sessions_set_updated_at before update on physical_sessions
  for each row execute function app.set_updated_at();

-- =========================================================================
-- RLS HELPER FUNCTIONS
-- See docs/PERMISSIONS.md for the full access model these implement.
-- SECURITY DEFINER so they can read staff_access/teams/profiles without
-- recursing into those tables' own RLS policies.
-- =========================================================================

create function app.has_club_access(target_club_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_access sa
    where sa.user_id = auth.uid() and sa.club_id = target_club_id and sa.team_id is null
  );
$$;

create function app.has_team_access(target_team_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_access sa
    join teams t on t.id = target_team_id
    where sa.user_id = auth.uid()
      and (sa.team_id = target_team_id or (sa.team_id is null and sa.club_id = t.club_id))
  );
$$;

create function app.has_sensitive_access(target_team_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_access sa
    join teams t on t.id = target_team_id
    where sa.user_id = auth.uid()
      and sa.role in ('ADMIN', 'CLUB_ADMIN', 'PERFORMANCE_DIRECTOR', 'HEAD_COACH', 'PHYSICAL_COACH', 'MEDICAL')
      and (sa.team_id = target_team_id or (sa.team_id is null and sa.club_id = t.club_id))
  );
$$;

-- Placeholder for a future player-facing portal (spec §80 consent workflows);
-- Sprint 1 creates no PLAYER-role logins, so this always returns false today.
create function app.is_self(target_player_id uuid) returns boolean
  language sql stable as $$
  select false;
$$;

grant execute on function app.has_club_access(uuid) to authenticated;
grant execute on function app.has_team_access(uuid) to authenticated;
grant execute on function app.has_sensitive_access(uuid) to authenticated;
grant execute on function app.is_self(uuid) to authenticated;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table clubs enable row level security;
alter table seasons enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table team_memberships enable row level security;
alter table profiles enable row level security;
alter table staff_access enable row level security;
alter table sporting_sessions enable row level security;
alter table matches enable row level security;
alter table match_rosters enable row level security;
alter table player_stints enable row level security;
alter table hockey_events enable row level security;
alter table event_participants enable row level security;
alter table possessions enable row level security;
alter table team_game_models enable row level security;
alter table kpi_definitions enable row level security;
alter table training_sessions enable row level security;
alter table training_attendance enable row level security;
alter table physical_sessions enable row level security;
alter table athlete_physical_sessions enable row level security;
alter table performance_metrics enable row level security;
alter table external_athlete_identities enable row level security;
alter table speed_zone_definitions enable row level security;
alter table hr_zone_definitions enable row level security;
alter table athlete_daily_metrics enable row level security;
alter table wellness_entries enable row level security;
alter table session_rpe_entries enable row level security;
alter table athlete_match_references enable row level security;

-- profiles: a user can read/update only their own row.
create policy profiles_self_select on profiles for select
  using (id = auth.uid());
create policy profiles_self_update on profiles for update
  using (id = auth.uid());

-- staff_access: read your own rows, or any row in a club you have club-wide access to.
create policy staff_access_select on staff_access for select
  using (user_id = auth.uid() or app.has_club_access(club_id));
create policy staff_access_write on staff_access for all
  using (app.has_club_access(club_id)) with check (app.has_club_access(club_id));

-- clubs / seasons
create policy clubs_select on clubs for select using (app.has_club_access(id));
create policy clubs_write on clubs for all
  using (app.has_club_access(id)) with check (app.has_club_access(id));

create policy seasons_select on seasons for select using (app.has_club_access(club_id));
create policy seasons_write on seasons for all
  using (app.has_club_access(club_id)) with check (app.has_club_access(club_id));

-- teams
create policy teams_select on teams for select using (app.has_team_access(id));
create policy teams_write on teams for all
  using (app.has_club_access(club_id)) with check (app.has_club_access(club_id));

-- players: visible to anyone with access to at least one team in the club
-- (a player has no team_id, so we check via any membership, or club-wide access).
create policy players_select on players for select
  using (
    app.has_club_access(club_id)
    or exists (
      select 1 from team_memberships tm
      where tm.player_id = players.id and app.has_team_access(tm.team_id)
    )
  );
create policy players_write on players for all
  using (app.has_club_access(club_id)) with check (app.has_club_access(club_id));

create policy team_memberships_select on team_memberships for select
  using (app.has_team_access(team_id));
create policy team_memberships_write on team_memberships for all
  using (app.has_team_access(team_id)) with check (app.has_team_access(team_id));

-- sporting_sessions: same team-scoping as matches/training_sessions, its children.
create policy sporting_sessions_select on sporting_sessions for select
  using (app.has_team_access(team_id));
create policy sporting_sessions_write on sporting_sessions for all
  using (app.has_team_access(team_id)) with check (app.has_team_access(team_id));

-- matches / roster / stints / events / possessions: team-scoped
create policy matches_select on matches for select using (app.has_team_access(team_id));
create policy matches_write on matches for all
  using (app.has_team_access(team_id)) with check (app.has_team_access(team_id));

create policy match_rosters_select on match_rosters for select
  using (exists (select 1 from matches m where m.id = match_id and app.has_team_access(m.team_id)));
create policy match_rosters_write on match_rosters for all
  using (exists (select 1 from matches m where m.id = match_id and app.has_team_access(m.team_id)))
  with check (exists (select 1 from matches m where m.id = match_id and app.has_team_access(m.team_id)));

create policy player_stints_select on player_stints for select
  using (exists (select 1 from matches m where m.id = match_id and app.has_team_access(m.team_id)));
create policy player_stints_write on player_stints for all
  using (exists (select 1 from matches m where m.id = match_id and app.has_team_access(m.team_id)))
  with check (exists (select 1 from matches m where m.id = match_id and app.has_team_access(m.team_id)));

create policy hockey_events_select on hockey_events for select using (app.has_team_access(team_id));
create policy hockey_events_write on hockey_events for all
  using (app.has_team_access(team_id)) with check (app.has_team_access(team_id));

create policy event_participants_select on event_participants for select
  using (exists (select 1 from hockey_events e where e.id = event_id and app.has_team_access(e.team_id)));
create policy event_participants_write on event_participants for all
  using (exists (select 1 from hockey_events e where e.id = event_id and app.has_team_access(e.team_id)))
  with check (exists (select 1 from hockey_events e where e.id = event_id and app.has_team_access(e.team_id)));

create policy possessions_select on possessions for select using (app.has_team_access(team_id));
create policy possessions_write on possessions for all
  using (app.has_team_access(team_id)) with check (app.has_team_access(team_id));

create policy team_game_models_select on team_game_models for select using (app.has_team_access(team_id));
create policy team_game_models_write on team_game_models for all
  using (app.has_team_access(team_id)) with check (app.has_team_access(team_id));

-- kpi_definitions: a row with a null team_id is a club-wide default, visible
-- to anyone with access to any team in the club; a row scoped to a specific
-- team also requires access to that team.
create policy kpi_definitions_select on kpi_definitions for select
  using (
    (team_id is null and app.has_club_access(club_id))
    or (team_id is not null and app.has_team_access(team_id))
  );
create policy kpi_definitions_write on kpi_definitions for all
  using (
    (team_id is null and app.has_club_access(club_id))
    or (team_id is not null and app.has_team_access(team_id))
  )
  with check (
    (team_id is null and app.has_club_access(club_id))
    or (team_id is not null and app.has_team_access(team_id))
  );

-- training
create policy training_sessions_select on training_sessions for select
  using (app.has_team_access(team_id));
create policy training_sessions_write on training_sessions for all
  using (app.has_team_access(team_id)) with check (app.has_team_access(team_id));

create policy training_attendance_select on training_attendance for select
  using (exists (
    select 1 from training_sessions ts
    where ts.id = training_session_id and app.has_team_access(ts.team_id)
  ));
create policy training_attendance_write on training_attendance for all
  using (exists (
    select 1 from training_sessions ts
    where ts.id = training_session_id and app.has_team_access(ts.team_id)
  ))
  with check (exists (
    select 1 from training_sessions ts
    where ts.id = training_session_id and app.has_team_access(ts.team_id)
  ));

-- sensitive physical/recovery data: has_sensitive_access OR the player themselves
create policy physical_sessions_select on physical_sessions for select
  using (app.has_sensitive_access(team_id));
create policy physical_sessions_write on physical_sessions for all
  using (app.has_sensitive_access(team_id)) with check (app.has_sensitive_access(team_id));

create policy athlete_physical_sessions_select on athlete_physical_sessions for select
  using (
    app.is_self(player_id)
    or exists (
      select 1 from physical_sessions ps
      where ps.id = physical_session_id and app.has_sensitive_access(ps.team_id)
    )
  );
create policy athlete_physical_sessions_write on athlete_physical_sessions for all
  using (exists (
    select 1 from physical_sessions ps
    where ps.id = physical_session_id and app.has_sensitive_access(ps.team_id)
  ))
  with check (exists (
    select 1 from physical_sessions ps
    where ps.id = physical_session_id and app.has_sensitive_access(ps.team_id)
  ));

create policy performance_metrics_select on performance_metrics for select
  using (exists (
    select 1 from athlete_physical_sessions aps
    join physical_sessions ps on ps.id = aps.physical_session_id
    where aps.id = athlete_physical_session_id
      and (app.is_self(aps.player_id) or app.has_sensitive_access(ps.team_id))
  ));
create policy performance_metrics_write on performance_metrics for all
  using (exists (
    select 1 from athlete_physical_sessions aps
    join physical_sessions ps on ps.id = aps.physical_session_id
    where aps.id = athlete_physical_session_id and app.has_sensitive_access(ps.team_id)
  ))
  with check (exists (
    select 1 from athlete_physical_sessions aps
    join physical_sessions ps on ps.id = aps.physical_session_id
    where aps.id = athlete_physical_session_id and app.has_sensitive_access(ps.team_id)
  ));

-- external identities / zone definitions / references: staff config, not raw
-- health data, but still restricted to sensitive-access roles.
create policy external_identities_select on external_athlete_identities for select
  using (exists (
    select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
  ) or app.is_self(player_id));
create policy external_identities_write on external_athlete_identities for all
  using (exists (select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)))
  with check (exists (select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)));

create policy speed_zones_select on speed_zone_definitions for select
  using (
    (club_id is not null and app.has_club_access(club_id))
    or (team_id is not null and app.has_team_access(team_id))
    or (player_id is not null and exists (
      select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
    ))
  );
create policy speed_zones_write on speed_zone_definitions for all
  using (
    (club_id is not null and app.has_club_access(club_id))
    or (team_id is not null and app.has_team_access(team_id))
    or (player_id is not null and exists (
      select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
    ))
  );

create policy hr_zones_select on hr_zone_definitions for select
  using (
    (club_id is not null and app.has_club_access(club_id))
    or (team_id is not null and app.has_team_access(team_id))
    or (player_id is not null and exists (
      select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
    ))
  );
create policy hr_zones_write on hr_zone_definitions for all
  using (
    (club_id is not null and app.has_club_access(club_id))
    or (team_id is not null and app.has_team_access(team_id))
    or (player_id is not null and exists (
      select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
    ))
  );

-- most sensitive: daily metrics, wellness, RPE — sensitive-access roles or the player themselves
create policy athlete_daily_metrics_select on athlete_daily_metrics for select
  using (app.is_self(player_id) or exists (
    select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
  ));
create policy athlete_daily_metrics_write on athlete_daily_metrics for all
  using (exists (select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)))
  with check (exists (select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)));

create policy wellness_entries_select on wellness_entries for select
  using (app.is_self(player_id) or exists (
    select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
  ));
create policy wellness_entries_write on wellness_entries for all
  using (app.is_self(player_id) or exists (
    select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
  ))
  with check (app.is_self(player_id) or exists (
    select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
  ));

create policy session_rpe_select on session_rpe_entries for select
  using (app.is_self(player_id) or exists (
    select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
  ));
create policy session_rpe_write on session_rpe_entries for all
  using (app.is_self(player_id) or exists (
    select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
  ))
  with check (app.is_self(player_id) or exists (
    select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)
  ));

create policy athlete_match_references_select on athlete_match_references for select
  using (exists (select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)));
create policy athlete_match_references_write on athlete_match_references for all
  using (exists (select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)))
  with check (exists (select 1 from players p where p.id = player_id and app.has_club_access(p.club_id)));

-- =========================================================================
-- STORAGE — player photos
-- Public read (photos aren't sensitive; simplifies serving without signed
-- URLs), authenticated write. Coarse-grained on purpose: the app never lets
-- an unauthenticated user reach the upload UI at all, so per-club scoping at
-- the storage layer isn't load-bearing the way it is for `players` itself.
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do nothing;

create policy player_photos_public_read on storage.objects for select
  using (bucket_id = 'player-photos');

create policy player_photos_authenticated_insert on storage.objects for insert
  with check (bucket_id = 'player-photos' and auth.role() = 'authenticated');

create policy player_photos_authenticated_update on storage.objects for update
  using (bucket_id = 'player-photos' and auth.role() = 'authenticated');

create policy player_photos_authenticated_delete on storage.objects for delete
  using (bucket_id = 'player-photos' and auth.role() = 'authenticated');
