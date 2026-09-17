# Permissions & Row Level Security

## Roles (spec §10)

`user_role` enum: `ADMIN, CLUB_ADMIN, HEAD_OF_HOCKEY, PERFORMANCE_DIRECTOR,
HEAD_COACH, ASSISTANT_COACH, ANALYST, PHYSICAL_COACH, MEDICAL, TEAM_MANAGER, PLAYER`.

Sprint 1 MVP actually assigns/uses: `ADMIN, HEAD_COACH, ASSISTANT_COACH, ANALYST`
(club demo data creates one `ADMIN` user with access to the whole club). The
other roles exist in the enum and the access model now so later sprints don't
need a migration to introduce them.

## Access model

Two tables carry authorization, both referenced by every RLS policy:

- `profiles(id = auth.uid(), club_id, display_name)` — which club a user
  belongs to at all.
- `staff_access(user_id, club_id, team_id nullable, role)` — `team_id IS NULL`
  means club-wide access (e.g. `CLUB_ADMIN`, `PERFORMANCE_DIRECTOR`); a row
  with `team_id` set scopes the role to that one team.

Helper SQL functions (in the migration, `SECURITY DEFINER`, used by every
policy below):

- `app.has_club_access(club_id uuid) returns boolean`
- `app.has_team_access(team_id uuid) returns boolean` — true if the user has a
  club-wide row for that team's club, OR a team-specific row for that team.
- `app.has_sensitive_access(team_id uuid) returns boolean` — same as above but
  role must be one of `ADMIN, CLUB_ADMIN, PERFORMANCE_DIRECTOR, HEAD_COACH,
  PHYSICAL_COACH, MEDICAL`.
- `app.is_self(player_id uuid) returns boolean` — true if the caller's
  `profiles` row is linked to that player (future: a player logging in to see
  their own data; Sprint 1 does not create player-role logins, but the
  function exists so wellness/RPE tables' policies are correct from day one).

## Policy pattern per table family

| Table family | Read policy | Write policy |
|---|---|---|
| `clubs`, `seasons` | `has_club_access(id)` | `has_club_access(id)` AND role IN (ADMIN, CLUB_ADMIN) |
| `teams` | `has_team_access(id)` | club-wide admin roles only |
| `players`, `team_memberships` | `has_team_access(...)` via join, OR club-wide | HEAD_COACH+ roles |
| `matches`, `match_rosters`, `player_stints`, `hockey_events`, `possessions` | `has_team_access(team_id)` | `has_team_access(team_id)` (ANALYST can tag; ASSISTANT_COACH+ can also edit/delete) |
| `training_sessions`, `training_attendance` | `has_team_access(team_id)` | HEAD_COACH+, PHYSICAL_COACH |
| `athlete_physical_sessions`, `performance_metrics`, `athlete_daily_metrics`, `wellness_entries`, `session_rpe_entries` | `has_sensitive_access(team_id)` OR `is_self(player_id)` | `has_sensitive_access(team_id)` |
| `external_athlete_identities`, `speed_zone_definitions`, `hr_zone_definitions`, `athlete_match_references` | `has_sensitive_access` (config, not raw health data, but still staff-only) | PHYSICAL_COACH+ |
| `staff_access` | user can read their own row; club-wide admins can read all for their club | club-wide admins only |

Full CREATE POLICY statements are in `supabase/migrations/0001_init.sql`
(section `-- RLS`). Every table has RLS **enabled** (`ENABLE ROW LEVEL
SECURITY`) — there is no table a signed-in-but-unauthorized user can read by
guessing an id.

## Client vs. server enforcement

RLS is the actual security boundary — Server Actions and page-level auth
checks (via the DAL pattern, `lib/supabase/dal.ts`) exist for UX (fast
redirects, hiding buttons) but every mutation still goes through Supabase with
the user's own JWT, so a compromised client can't bypass policy by calling a
Server Action directly. Live-encoding's client-side Supabase calls (see
OFFLINE_STRATEGY.md) rely on this: there is no server-side re-check possible
for an offline-queued write, so RLS must be correct on its own.

## Privacy (spec §80)

- Minors: no field distinguishes minors today beyond `players.birth_date`;
  age-based consent/parental-access workflows are out of scope for Sprint 1
  and flagged in ROADMAP.md as a pre-launch legal requirement, not a
  technical one to solve silently.
- Data export/deletion: not built in Sprint 1. Because everything keys off
  `player_id` with `ON DELETE CASCADE` from `players`, a full "delete this
  athlete" is already a single `DELETE FROM players WHERE id = ...` — the
  hard part (an admin-facing export/delete UI with audit logging) is Sprint 4+.
