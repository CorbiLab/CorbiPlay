# Data Model

Full DDL lives in [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
This document explains the shape and the reasoning; read the migration for exact
columns/types.

## Club tree vs. team membership: the two shapes that matter

This is the one diagram to internalise before anything else in this document.
The model is a **tree with two branches under Club**, not a linear
`club → season → team → player` chain — a player is never a child of a team:

```
Club
├── Players                        (club-owned identity; no team_id, ever)
├── Staff Access                   (club-wide or team-scoped roles)
└── Seasons
    └── Teams
        ├── Matches
        │     ├── MatchRoster ─────── Player   (player_id direct, not via membership)
        │     ├── PlayerStint ─────── Player
        │     ├── HockeyEvent ─────── Player (nullable — team-level events allowed)
        │     └── Possession
        └── TrainingSessions
              └── TrainingAttendance ─ Player

Player ⇄ Team  via TeamMembership   (cross-cutting, NOT containment —
                                      a player can hold several at once)
```

`TeamMembership` is the *only* edge between the Player branch and the
Team branch. Everything else that touches a player from inside a team's
subtree (`match_rosters`, `training_attendance`, `hockey_events`,
`player_stints`) points at `players.id` **directly**, not at
`team_memberships.id` — see the "Critical rules" table below for why (a
guest/temporary player must be selectable without a permanent membership row).

### The sporting-session identity (feeds the physical/load domain)

`Match` and `TrainingSession` are two different *kinds* of the same underlying
thing — "a team did something sporting on a date" — and that shared identity
is what the physical/GPS/RPE/load domain hangs off. See
[ARCHITECTURE.md ADR-001](ARCHITECTURE.md#adr-001-a-shared-sporting_sessions-identity-for-matchtraining)
for the full comparison and decision; in short:

```
sporting_sessions (id, team_id, kind: MATCH|TRAINING, session_date, start/end_timestamp)
  ▲                                    ▲
  │ id IS shared (same UUID)           │ id IS shared (same UUID)
matches ──────────────┐        training_sessions ──────────────┐
  ├── match_rosters    │  (unchanged — still reference           │
  ├── player_stints    │   matches.id / training_sessions.id      │
  ├── hockey_events    │   directly, exactly as before)            │
  └── possessions      │                                training_attendance
                        │
        physical_sessions.sporting_session_id ─┐  (one FK, not a
        session_rpe_entries.sporting_session_id ┘   match_id/training_id XOR)
```

Application code never touches `sporting_sessions` directly — a trigger
creates/updates/deletes the parent row transparently whenever `matches` or
`training_sessions` is written to (see the migration). This means: nothing
that already worked in Sprint 1 changes, and the physical/load domain gets a
single, simple join for "regardless of match or training" queries instead of
a `LEFT JOIN` to both tables plus a `COALESCE`.

### Full table map

```
clubs ──< seasons ──< teams ──< matches ──< match_rosters >── players
  │                     │           │
  │                     │           ├──< player_stints >── players
  │                     │           ├──< hockey_events >── players (nullable)
  │                     │           └──< possessions
  │                     │
  │                     └──< training_sessions ──< training_attendance >── players
  │
  ├──< players (club-owned identity, NO team_id column)
  │       └──< team_memberships >── teams   (the ONLY player↔team link)
  │
  └──< staff_access >── auth.users   (club_id, optional team_id, role)

sporting_sessions (shared id with matches/training_sessions — see above)
  └──< physical_sessions ──< athlete_physical_sessions >── players
         athlete_physical_sessions ──< performance_metrics (generic provider metrics)
  └──< session_rpe_entries >── players

players ──< external_athlete_identities (STATSPORTS / GARMIN / CATAPULT / POLAR)
players ──< athlete_daily_metrics (Garmin/wellness-provider daily rollups)
players ──< wellness_entries
players ──< athlete_match_references (configurable "normal match" baseline)
clubs/teams/players ──< speed_zone_definitions, hr_zone_definitions (most-specific wins)
```

## Critical rules and how the schema enforces them

These map directly to spec §82 and §86. Each was verified before Sprint 1 code
was written:

| Rule | Enforcement |
|---|---|
| Player has no permanent `team_id` | `players` table has no `team_id` column at all. |
| TeamMembership connects Player and Team | `team_memberships(team_id, player_id, membership_type, start_date, end_date)`, multiple rows per player allowed. |
| MatchRoster references Player | `match_rosters.player_id → players.id`, not team_memberships, so a temporary/guest player can be selected without a permanent membership. |
| TrainingAttendance references Player | same reasoning: `training_attendance.player_id → players.id`. |
| Physical performance references Player + Session, regardless of match/training | `athlete_physical_sessions(physical_session_id, player_id)`; `physical_sessions.sporting_session_id → sporting_sessions.id` — a single required FK, not a nullable-pair CHECK. See [ADR-001](ARCHITECTURE.md#adr-001-a-shared-sporting_sessions-identity-for-matchtraining). |
| External identities reference Player | `external_athlete_identities.player_id`, unique per `(provider, player_id)` and per `(provider, external_id)` — never per team. |
| Garmin/STATSports identity is not team-specific | same table as above; no team column. |
| Player history survives season/team changes | all match/training/physical/load rows key off `player_id`; teams and seasons only constrain which matches/sessions exist, not which player rows exist. |
| Load aggregates across all sessions involving the athlete | load rollups (see ARCHITECTURE.md §Analytics) `GROUP BY player_id` across `athlete_physical_sessions` and `session_rpe_entries` joined through whichever session table, regardless of `team_id`. |

## Source-of-truth vs derived data

- **Source of truth**: `hockey_events`, `player_stints` (derived from
  substitution events, but stored because they're expensive to recompute on
  every read), `possessions`, `athlete_physical_sessions`, `wellness_entries`,
  `session_rpe_entries`, `athlete_daily_metrics`.
- **Derived / computed on read (or via a view), never hand-updated**: match
  score, player match stats, conversion funnel, momentum, load rollups (7/28-day),
  match-reference percentages. Deleting or editing a `hockey_events` row must
  never require patching five other tables — see ARCHITECTURE.md §Event
  sourcing for how this is kept simple without a full event-sourcing framework.

## Enumerations

Defined as Postgres `enum` types in the migration: `user_role`, `membership_type`,
`match_status`, `home_away`, `event_category`, `event_type`, `event_outcome`,
`training_session_type`, `attendance_status`, `external_provider`,
`sporting_session_kind` (`MATCH` / `TRAINING` — see ADR-001).
`event_type` is intentionally a flat enum (not a separate table) for Sprint 1 —
see ARCHITECTURE.md §Event definitions for why the *behaviour* per event type
(player required? position required? outcome required?) lives in code, not the DB.

Deliberately **not** enums, even though they read like one: `team_memberships.positions`
(a `text[]`, since a player can hold several — see athletes/position-labels.ts)
and every tactical-analytics classification column below — see ADR-002.

## Tactical analytics readiness (ADR-002, docs/HOCKEY_ANALYTICS.md)

`possessions` (previously unused) gained classification columns
(`attack_type`, `tactical_context`, `outcome`, `possession_start_type`,
`metadata`) plus `start/end_timestamp`; `hockey_events` gained a nullable
`possession_id` FK to it and a nullable `pressure_context`. Two new inert
tables, `kpi_definitions` and `team_game_models`, exist for a future
declarative KPI dashboard and per-team game-model config. None of this is
read or written by any screen yet — full model, rationale, and the pure
analytics functions that already work over it (`modules/analytics/logic/sequences.ts`)
are in HOCKEY_ANALYTICS.md.

## Encoding levels & multi-player events (ADR-003, docs/HOCKEY_ANALYTICS.md)

`hockey_events` gained `capture_level` (what detail the analyst was asked
for) and `enrichment_status` (has this been reviewed since). A new table,
`event_participants(event_id, player_id, role, order_index, metadata)`,
records events involving more than one player (PRESS today) — additive to,
not a replacement for, `hockey_events.player_id`/`.secondary_player_id`,
which every other event type keeps using unchanged. `event_type`/
`event_category` gained `'PRESS'`. None of this is a new conceptual layer —
encoding level is a live-screen display setting, not a different data model
(the update's own core principle: three levels, one schema).

## Deliberately NOT modelled yet (documented, not built)

- **High-frequency raw GPS/IMU samples** (`timestamp, lat, lon, speed, accel,
  heading, quality` at 10-20Hz). When STATSports API integration lands, this
  should be its own table (or object storage + pointer row), partitioned by
  month, and never joined directly into `athlete_physical_sessions` — that
  table stays aggregate-only. Not created now because nothing reads/writes it
  before Sprint 3+.
- **Video timeline** (`video_id`, `video_timestamp_ms`) — will be added as
  nullable columns on `hockey_events` plus a `videos` table in Sprint 7. No
  schema change needed to the rest of the model.
- **Peak-demand windows** (1/3/5-minute rolling peaks) — computed from
  `athlete_physical_sessions` + a future high-frequency table; pure
  read-side calculation, no new persisted table required.

## RLS summary

See [PERMISSIONS.md](PERMISSIONS.md) for the full policy design. In one line:
every table is scoped by club (via `teams.club_id` or a direct `club_id`), most
are further scoped by team access, and the physiologically sensitive tables
(`wellness_entries`, `athlete_daily_metrics`, `session_rpe_entries`,
`athlete_physical_sessions`, `performance_metrics`) require a *sensitive-data*
role (MEDICAL, PHYSICAL_COACH, HEAD_COACH, PERFORMANCE_DIRECTOR, CLUB_ADMIN,
ADMIN) or being the player yourself — an ASSISTANT_COACH or ANALYST can see
match stats but not a player's sleep score.
