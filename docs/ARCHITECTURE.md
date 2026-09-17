# Architecture

## Stack decisions and why

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), TS strict | Requested. **Note:** this Next.js install ships real breaking changes vs. common training-data knowledge — `middleware.ts` is renamed `proxy.ts` (same behaviour), and a new opt-in "Cache Components" model exists (`cacheComponents: true` in `next.config.ts`). We do **not** enable it: this app is an authenticated, per-club, mostly-dynamic dashboard, not a cacheable content site, and Cache Components' `use cache` discipline would add ceremony with no payoff here. We stay on the previous (familiar) rendering model: Server Components fetch per-request, `cookies()`/`headers()` opt a route into dynamic rendering, no implicit caching surprises. |
| UI | Tailwind v4 + shadcn/ui (`base` preset) + Recharts + lucide-react | Requested; shadcn gives accessible primitives without owning a component library. |
| Backend/DB | Supabase (Postgres + Auth + RLS + Storage later for video) | Requested. |
| Validation | Zod v4 | Requested; note v4's error-message API (`{ error: '...' }` instead of `message`). |
| Client state | Zustand, scoped to feature stores (`live-encoding` store, `match-clock` store) | Lightweight, no boilerplate, easy to persist to IndexedDB for offline. We do **not** introduce Redux/RTK/Recoil — one small store per bounded context is enough. |
| Server data fetching | Server Components + `@supabase/ssr` server client | No extra data-fetching library (no React Query) needed for Sprint 1's mostly-server-rendered dashboards. Client-side realtime/offline needs (live encoding) are handled by the dedicated offline layer, not a generic cache library — see OFFLINE_STRATEGY.md. |
| Testing | Vitest + Testing Library, Playwright reserved for later E2E | Fast unit tests for the business logic listed in spec §78. |

## Repository structure

```
src/
  app/                          # routes only — thin, no business logic
    (auth)/login/
    (app)/                      # authenticated shell: team-context header, nav
      dashboard/
      teams/[teamId]/
      athletes/ , athletes/[playerId]/
      matches/ , matches/new/ , matches/[matchId]/
        dashboard/              # match analysis dashboard
      settings/...
    (live)/                     # no AppShell — fullscreen iPad live-encoding (ADR-005)
      matches/[matchId]/live/   # same URL as before; only the layout moved
    api/...                     # route handlers only where a Server Action
                                 # doesn't fit (e.g. CSV import upload target)
  modules/                      # one folder per domain — the actual logic
    club/
    teams/
    athletes/
    matches/                    # match CRUD, roster, quarter/clock engine
    live-encoding/              # event definitions, pitch zones, offline store
    training/
    performance/                # GPS/HR/load calculations (Sprint 3+, stubs now)
    integrations/               # provider adapters (Sprint 3+, interfaces now)
    analytics/                  # match stats, conversion funnel, momentum
  components/
    ui/                         # shadcn primitives (generated, don't hand-edit)
    pitch/                      # <HockeyPitch />, zone overlays
    shared/                     # app-wide layout pieces (team-context header, nav)
  lib/
    supabase/                   # server.ts, browser.ts, middleware/proxy helper
    zod/                        # shared schemas
    utils.ts
  config/
    app.ts                      # app display name, quarter defaults, etc.
  stores/                       # zustand stores
  types/                        # generated Supabase types + domain types
supabase/
  migrations/
docs/
```

Each `modules/<domain>` folder exposes:

- `queries.ts` — server-side reads (Supabase queries), pure and testable independent of Next.
- `actions.ts` — `'use server'` Server Actions (mutations), each re-verifying auth/role.
- `logic/` — pure functions with no I/O (clock math, zone math, funnel math, stint
  math) — this is what spec §78's unit tests target.
- `types.ts` — domain types (distinct from raw generated DB types where the
  shape differs, e.g. a computed `PlayerMatchStats`).

UI components live under `app/**` (route-specific) or `components/**`
(shared); they call into `modules/*` — no Supabase client calls and no business
math directly inside a `.tsx` page/component.

## Event sourcing, pragmatically (spec §72/§88)

`hockey_events` is the single source of truth for match analytics. We do **not**
adopt a general event-sourcing framework, append-only ledger replay engine, or
CQRS — that's the over-engineering the spec explicitly warns against. Instead:

- All match statistics (score, player stats, conversion funnel, momentum,
  possessions) are **computed from `hockey_events` on read** inside
  `modules/analytics`, either as plain SQL aggregations or in-memory reduction
  over the match's event list (a match has at most a few hundred events —
  trivial to recompute on every dashboard load).
- Editing or deleting an event never requires "fixing up" other rows, because
  no other row duplicates what an event implies. The only exception is
  `player_stints`, which is a materialized derivation of `PLAYER_IN`/`PLAYER_OUT`
  events — recomputing stints is a pure function
  (`modules/matches/logic/stints.ts`) re-run after every substitution edit/undo,
  not hand-patched.
- **Undo** = delete the most recent event row (soft: `deleted_at`, so history
  is auditable) and re-run the derived-stat computation. No separate undo log needed.

## Match clock (spec §22)

The clock is **anchored on the server, not trusted from `setInterval`**:
starting/resuming a quarter writes a `quarter_started_at` (absolute UTC
timestamp) to the `matches` row (plus accumulated paused duration); the client
derives `elapsed = now - quarter_started_at - pausedMs` every tick. On page
refresh, the client re-reads the anchor and immediately resumes correct
elapsed time — no client-only timer state can desync it. Pausing writes
`paused_at`; resuming adds the paused delta to `paused_ms_total` and clears
`paused_at`. This is a handful of columns on `matches`, not a separate
event-sourced clock engine.

## Pitch geometry & zones (spec §27–28)

`<HockeyPitch />` (`components/pitch/hockey-pitch.tsx`) is an SVG component
that renders sidelines/backlines/23m lines/circles/goals at real proportions
(field hockey pitch: 91.4m × 55m) and converts a tap's pixel position to
normalised `{x: 0-100, y: 0-100}` via `getBoundingClientRect`. Raw `(x, y)` is
what's stored on `hockey_events` — zones are always derived
(`modules/live-encoding/logic/pitch-zones.ts::getPitchZone(x, y, attackingDirection)`),
so changing the zone boundaries later never requires a data migration.

## Provider adapters (spec §7, §44, §51, §89)

```ts
// modules/integrations/types.ts
interface AthleteDataProvider {
  connect(config: ProviderConfig): Promise<void>
  syncAthlete(playerId: string): Promise<ExternalAthleteIdentity>
  syncActivities(playerId: string, range: DateRange): Promise<AthletePhysicalSession[]>
  syncDailyMetrics(playerId: string, range: DateRange): Promise<AthleteDailyMetric[]>
}
```

Sprint 1 ships only the interface and a `MockProvider` used exclusively in
seed/test fixtures, clearly labelled `MOCK` in its data (`provider: 'MOCK_DEMO'`
is not a valid value in the real `external_provider` enum — demo fixtures use
the real `STATSPORTS`/`GARMIN` enum values but every seed script prints a
banner that the data is fabricated demo data, and this is documented, never
presented in UI copy as "synced"). No fake network calls, no fake OAuth flow.

## Multi-tenancy / team context

The active club/team/season is not global server state — it's carried in the
URL (`/teams/[teamId]/...`) and in a small client `team-context` store synced
from the URL, so "switch team" is just a navigation, and RLS (not client code)
is the actual security boundary.

## ADR-001: a shared `sporting_sessions` identity for Match/Training

**Status:** accepted, implemented in `0001_init.sql` before Sprint 1 code touched it.

### Context

`Match` and `TrainingSession` are the two things a team does on a given date.
Both need to carry physical/GPS load, RPE, and eventually feed one athlete
timeline ("every sporting participation and physical load for player X
between date A and date B, regardless of team and regardless of whether the
session was a match or training" — the hard requirement this ADR exists to
satisfy). The original schema modelled that with a nullable-pair CHECK:

```sql
physical_sessions (
  match_id uuid references matches(id),
  training_session_id uuid references training_sessions(id),
  constraint physical_session_one_parent check (
    (match_id is not null)::int + (training_session_id is not null)::int = 1
  )
)
```

Before freezing the migration, we compared that ("Option A") against giving
Match and Training a shared identity via a supertype table ("Option B")
across every dimension that actually matters for this product.

### Option A — keep `match_id XOR training_session_id`

### Option B — `sporting_sessions` shared identity (chosen)

A parent table with `kind: MATCH | TRAINING`; `matches.id` and
`training_sessions.id` **are** `sporting_sessions.id` — the same UUID,
populated transparently by a trigger. This is the standard relational
"table-per-type with a shared-PK supertype" pattern (sometimes called
class-table inheritance), not a novel invention.

### Comparison

| Dimension | A — XOR columns | B — shared `sporting_sessions` |
|---|---|---|
| Referential integrity | Solid — a `CHECK` constraint genuinely prevents both-null and both-set. Not weaker than B, just less ergonomic. | Equally solid — a single `NOT NULL` FK. The win here isn't strength, it's that there's no "which of two nullable columns is set" branch for every consumer to get right. |
| Query simplicity (single type) | Simple — query `matches` or `training_sessions` directly. | Identical — `matches`/`training_sessions` are untouched; querying one type alone is no different. |
| Query simplicity (both types) | `LEFT JOIN` to both parents + `COALESCE(m.match_date, t.date)` in every cross-cutting query. | One join, one `sporting_sessions.session_date`. This is the whole point of the ADR. |
| 7/28-day rolling load | Needs the double-join/coalesce in every window query. | `group by player_id … where sporting_sessions.session_date between …` — one shape, reused everywhere. |
| Athlete history timeline | Requires a `UNION` of two differently-shaped subqueries, or the double join. | One table to sort/paginate by date, regardless of kind. |
| STATSports import | Importer must resolve "which table has a row on this date for this team" by checking two tables. | One lookup: `sporting_sessions where team_id = … and session_date = …`. |
| Garmin activity matching | Same two-table resolution problem. | Same one-table win. |
| RPE | `session_rpe_entries` had the identical XOR — same pain, independently. | Fixed the same way, same migration. |
| Time on pitch (`player_stints`) | N/A — match-only concept (quarters don't exist in training). | **Unaffected either way** — `player_stints` keeps referencing `matches.id` directly. Not in scope for this ADR. |
| Training attendance | N/A — training-only concept (starter/goalkeeper don't exist in training). | **Unaffected either way** — `training_attendance` keeps referencing `training_sessions.id` directly. Deliberately *not* merged into a generic participation table — see "What we did not do" below. |
| Match roster | N/A | **Unaffected either way** — `match_rosters` keeps referencing `matches.id` directly. Zero risk to the Sprint 1 live-encoding critical path. |
| GPS/HR sync (spec §61 unified timeline) | Each session type would need its own wall-clock start/end fields, named differently. | `sporting_sessions.start_timestamp/end_timestamp` gives one canonical wall-clock span per session, any kind, for free. |
| Sprint 1 complexity/risk | Zero change — already built this way. | **Also effectively zero**, because the parent row is maintained by a trigger. `createMatch` and every other piece of Sprint 1 code that already works keeps working unmodified — confirmed nothing in `src/` referenced `physical_sessions`/`session_rpe_entries` before this change (`grep` came back empty outside the migration and generated types). |
| Future evolvability | Adding a third session kind (e.g. an assessment/testing day) means widening a CHECK and adding a third nullable column to every consuming table. | Adding a third kind is one enum value + one subtype table + one trigger. Every existing cross-cutting query keeps working unchanged. |

### Decision

**Option B.** The XOR pattern is not wrong, but it pushes a "which of two
nullable FKs" branch onto every single cross-cutting query the product
actually needs (load rollups, athlete history, provider imports) — and the
product's own hard requirement ("regardless of match or training") is
precisely that cross-cutting shape. Option B pays that cost exactly once, in
the schema, and for free everywhere else.

### Implementation

- `sporting_sessions(id, team_id, kind, session_date, start_timestamp, end_timestamp)`.
- `matches.id` and `training_sessions.id` both declare
  `references sporting_sessions(id) on delete cascade` on their own primary
  key column — the shared-PK pattern, not a separate FK column.
- A `before insert` trigger on `matches` (and identically on
  `training_sessions`) creates the `sporting_sessions` row using `NEW.id`
  before the child row's FK check runs. `after update`/`after delete`
  triggers keep the two in sync. **Application code never inserts, updates,
  or deletes `sporting_sessions` directly** — `modules/matches/actions.ts`
  and the (future) `modules/training/actions.ts` only ever touch `matches` /
  `training_sessions`, exactly as already built.
- `physical_sessions` and `session_rpe_entries` reference
  `sporting_session_id` — one required FK, no CHECK constraint needed.

### What we did not do

We considered — and rejected, for now — collapsing `match_rosters` and
`training_attendance` into one generic `AthleteParticipation` table sitting
between `sporting_sessions` and the physical-load chain. Rejected because:

- The two tables have genuinely different shapes: a match roster needs
  `starter`/`goalkeeper`/`shirt_number` (drives the Sprint 1 live-encoding
  16-player screen directly); training attendance needs
  `status`/`participation_percentage`. Merging them means either a wide table
  full of nulls or a JSONB "details" blob — worse for the one table Sprint 1's
  live encoding depends on most, for a benefit that only matters to
  Sprint 3+ analytics.
- The actual cross-cutting need ("how much did this athlete do, regardless of
  session type") is served by `physical_sessions`/`athlete_physical_sessions`,
  which this ADR already unifies. A generic participation table isn't load-
  bearing for that query.
- Nothing stops introducing it later — `match_rosters`/`training_attendance`
  already reference `matches.id`/`training_sessions.id`, which are
  `sporting_sessions.id` values, so a future `athlete_participations` view or
  table could union them without any migration to the tables themselves.

## ADR-002: sequence/tactical-analytics readiness (schema only)

**Status:** accepted, implemented in `0001_init.sql`. No live-encoding UI or
calculation engine changes — see docs/HOCKEY_ANALYTICS.md for the full model
this prepares for.

### Context

The tactical-analytics complementary spec asks Hockey Trace to eventually
answer questions like "which side generates the most Circle Entries" or
"how effective were counter attacks vs. established attacks" — which means
grouping `hockey_events` into possessions/sequences, classifying those
sequences (attack type, tactical context, outcome), and exposing
club-configurable KPIs. Sprint 1 must not turn into that whole product, but
the event/possession schema has to be ready for it before it's harder to
change (the explicit ask: "prepare the model only").

### Decision 1 — tactical vocabulary is `text`, not an enum

`possessions.attack_type` / `.tactical_context` / `.possession_start_type` /
`.outcome` and `hockey_events.pressure_context` are plain nullable `text`
columns, each with a *suggested* value list in
`src/modules/analytics/logic/tactical-vocabulary.ts`, not a Postgres `enum`.
A coach's tactical
vocabulary differs by club (spec §7: "these labels are examples... avoid
hardcoding the entire tactical model"); a Postgres enum requires a migration
(`ALTER TYPE ... ADD VALUE`) for every new label, which is exactly the
friction this decision avoids. This deliberately trades a small amount of
DB-level validation for zero-migration extensibility — application code
validates against the current suggested/configured list, not a `CHECK`
constraint.

This does **not** apply to `hockey_events.event_type` — the fixed hockey
vocabulary (Ball Win, Shot, Goal...) stays a real enum, because it's the
sport's own event model, not a per-club tactical opinion.

### Decision 2 — `possessions` stays derive-first; `possession_id` is the readiness hook, not a requirement

`hockey_events.possession_id` is a nullable FK to `possessions(id)`. Nothing
writes it yet — no live-encoding button creates a `possessions` row, and
`modules/analytics/logic/possession.ts`'s existing `computePossessions()`
(which derives possession *intervals* from `POSSESSION_START`/`POSSESSION_END`
event pairs, with no DB row at all) is untouched. The new
`modules/analytics/logic/sequences.ts` functions take a `Possession` row and
find its events by **time window + team**, not by the FK — so they work the
moment anything starts inserting `possessions` rows, without that write path
also having to backfill `possession_id` on every event it groups. Whichever
Sprint 2 mechanism ends up creating possession rows (a live tag, a post-match
segmentation tool, or automatic inference) can populate the FK for a faster
lookup later; it is additive, not a prerequisite.

Why not skip the FK and stay fully derived? Because `attack_type` /
`tactical_context` / sequence `outcome` are classifications a human (or,
later, an inference step) assigns to *one specific sequence* — they need a
stable row with an `id` to attach to. A purely computed interval has no
identity to hang a manual classification on. This is the concrete reason
`possessions` graduates from unused schema to something Sprint 2 will
actually write to.

### Decision 3 — `duration_ms` and similar values are never stored

Every value derivable from `start_match_elapsed_ms`/`end_match_elapsed_ms`,
coordinates, or event order (duration, reach-rate, high-ball-win, defensive
turnover, pitch zone, lane) is a pure function
(`modules/analytics/logic/sequences.ts`, reusing
`modules/live-encoding/logic/pitch-zones.ts`'s `getPitchZone`), never a
column. Same principle already applied to `match-stats.ts` — see spec §36/§40:
cache later only if a real performance need appears; don't pre-optimize now.

### Decision 4 — `KpiDefinition` and `TeamGameModel` are inert schema, not a feature

`kpi_definitions` and `team_game_models` exist so a future KPI dashboard and
per-team game-model config don't need a destructive migration to add —
nothing reads or writes either table yet, and there is no editor UI. This is
deliberately the same "prepare, don't build" treatment as ADR-001's shared
`sporting_sessions` identity: the cost is paid once, now, in the schema.
`calculation_type` is a closed set of app-known calculators (never arbitrary
code) — see HOCKEY_ANALYTICS.md's "KPI architecture" for why.

### What we did not do

- No live-encoding screen changes. `attack_type`/`tactical_context`/
  `pressure_context` are not live-tagged anywhere — spec §42's own review
  question ("does the analyst genuinely need to enter this while watching
  the match?") answers no for all of them in Sprint 1.
- No automatic sequence classification, no PC sub-workflow, no shot-type
  detail, no team-game-model editor, no KPI calculation engine. All
  explicitly deferred by the spec itself.
- No change to `computePossessions()`/`possessionPercentageByTeam()` — the
  existing possession-% stat on the match dashboard keeps working exactly as
  before; the new `sequences.ts` functions are additive, not a replacement.

## ADR-003: three encoding levels + multi-player event participants

**Status:** accepted, implemented in `0001_init.sql` and the live-encoding
screen. See docs/HOCKEY_ANALYTICS.md for the analyst-facing explanation of
encoding levels and PRESS.

### Context

An elite analyst's review of the Sprint 1 live-encoding UX flagged a real
risk: assuming a player selection for every event doesn't hold up when a
single analyst is covering a match alone, or coding post-match with less
staff availability. The update asks for three "encoding levels" (BASIC,
STANDARD, ADVANCED) that change *what the analyst is asked to enter*, never
*how an event is stored* — plus first-class support for events with more
than one player (PRESS, and future PC units).

### Decision 1 — encoding level is a client-side display setting, not new schema

`encodingLevel` lives only in the Zustand live-encoding store
(`"BASIC" | "STANDARD" | "ADVANCED"`, default `"STANDARD"` — Sprint 1's
existing screen, unchanged unless an analyst switches). Switching it:

- never resets roster, events, clock, sync queue, or the in-progress draft
  (it's a sibling field in the same store, not a different store or a
  remount);
- changes two things only: which `RequirementLevel` `resolvePlayerRequirement()`
  returns for the current draft (display emphasis, never a save-blocker
  outside substitutions — see Decision 2), and whether the roster panel
  column is visible (BASIC collapses it to reclaim pitch space per spec
  §22; a "Joueurs" button peeks at it without leaving BASIC, spec §21).

Every event this stores is stamped with `hockey_events.capture_level`
(defaulting to whatever `encodingLevel` was at save time) purely as a
record of what the analyst was asked for — analytics can can filter by it
later (spec §26), but nothing reads it yet.

### Decision 2 — player attribution tops out at RECOMMENDED, except substitutions

`EventDefinition.playerRequirement` replaces the old boolean
`playerRequired` with `"OPTIONAL" | "RECOMMENDED" | "REQUIRED"`
(`modules/live-encoding/event-definitions.ts`). `REQUIRED` is reserved for
`PLAYER_IN`/`PLAYER_OUT` only: a substitution *is* a specific player leaving
or entering, and `player_stints`/on-field tracking would silently corrupt
without one — there's no team-level fallback the way "someone won the ball"
is still meaningful data. Every other event type is at most `RECOMMENDED`.

`resolvePlayerRequirement(def, level)` relaxes `RECOMMENDED` to `OPTIONAL`
in BASIC and leaves it alone in STANDARD/ADVANCED. This is deliberately a
two-level function, not a full BASIC/STANDARD/ADVANCED × HIDDEN/OPTIONAL/
RECOMMENDED/REQUIRED matrix per event type: the update's own SHOT example
("BASIC: optional, STANDARD: optional, ADVANCED: recommended") only ever
describes *emphasis* — modelling a value that never changes what's allowed
to save, across three levels for 28 event types, is exactly the
overengineering the update warns against.

`validateDraftEvent()` — the function that gates auto-save — only ever
blocks on `playerRequirement === "REQUIRED"`, so a BASIC-coded
`BALL_WIN`/`ENTRY_25`/`SHOT`/`GOAL`/`PC_WON` with zero player attribution
saves exactly as readily as a fully-attributed one (acceptance test: spec
§32).

### Decision 3 — `event_participants`, not `player_id`/`secondary_player_id`/`third_player_id`

A PRESS can involve any number of players. Rather than widening
`hockey_events` with more nullable player columns (doesn't scale, per the
update), a new table:

```sql
event_participants (id, event_id, player_id, role, order_index, metadata, created_at)
```

`role` is free text (`PRESSER`, `PRESS_SUPPORT`, ... —
`tactical-vocabulary.ts`'s `SUGGESTED_PRESS_PARTICIPANT_ROLES`), same
reasoning as every other club-configurable vocabulary column in ADR-002:
extensible without a migration.

**`hockey_events.player_id`/`.secondary_player_id` are kept, not replaced**
(the update's option A). Reasons:

- Every existing single-player event type (the overwhelming majority — 26 of
  28) already reads/writes them; replacing them would touch
  `match-stats.ts`, `sequences.ts`, the athlete profile's event history, and
  every existing test for zero behavioural gain.
- Querying "this player's events" stays a single indexed column lookup
  (`hockey_events_player_idx`) instead of a join through
  `event_participants` for the common case.
- `event_participants` is additive and only populated for
  `participantSelectionMode: "MULTIPLE"` events (PRESS today) — there is no
  risk of the two becoming inconsistent, because single-player event types
  never write to `event_participants` at all.

### Decision 4 — PRESS is a first-class event type, not `pressure = HIGH`

PRESS (the team's defensive action) and pressure (`hockey_events.pressure_context`,
ADR-002 — how much the ball carrier feels pressured) are kept conceptually
and structurally separate, per the update's explicit instruction. PRESS is
`event_category`/`event_type` `'PRESS'`, `participantSelectionMode: "MULTIPLE"`,
position required, and its 5-value outcome
(`BALL_WIN`/`FORCED_BACKWARD`/`FORCED_LONG_BALL`/`BROKEN`/`NO_EFFECT`) lives
in `metadata.pressOutcome` rather than the generic 3-value `event_outcome`
enum, which would collapse distinct outcomes the update's own analytics
list (§28) needs kept apart. None of PRESS's fields — players, position,
outcome — block a save; only "PRESS + a pitch tap" is ever required, in any
encoding level.

### Decision 5 — `enrichment_status`, and enrichment never duplicates an event

`hockey_events.enrichment_status` (`RAW` default) distinguishes "nobody has
looked at this yet" from "reviewed" without needing a second table.
`patchEvent()` (already existed, for the post-goal "Assist?" prompt) now
also accepts `player_id`, and bumps `RAW` → `PARTIAL` the moment a player is
assigned after the fact. `addEventParticipants()` does the same for a
MULTIPLE-participant event — both mutate the existing row/append
participant rows by the same `event_id`; neither ever creates a second
event (spec §35's explicit requirement).

### What we did not do

- No dedicated ADVANCED-only screen layout yet — ADVANCED currently renders
  identically to STANDARD (full roster + events + pitch); the update's
  ADVANCED-specific fields (detailed tactical context entry, press type
  picker, multi-player role assignment beyond PRESSER/PRESS_SUPPORT
  ordering) are deferred, consistent with "do not implement every advanced
  field."
- No dedicated post-match review screen. `patchEvent`/`addEventParticipants`
  are real, tested store actions — the capability spec §35 asks for — but
  the polished "tap a timeline event to enrich it" UI is Sprint 2+.
- No automatic BASIC→ADVANCED per-event temporary-detail gesture (spec
  §21's "long press") — the "Joueurs" peek button covers the one concrete
  need (seeing the roster without leaving BASIC); a per-event detail
  expansion is deferred until a specific field actually needs it.
- No `event_definitions` DB table — same reasoning as ADR-001/ROADMAP item 2:
  nothing needs this end-user-editable yet.

## ADR-004: opponent-side event/possession tagging

**Status:** accepted, implemented in `0001_init.sql` and the live-encoding
screen. See docs/HOCKEY_ANALYTICS.md and ROADMAP.md issue #1 for the
analyst-facing background.

### Context

ROADMAP issue #1 flagged early that `hockey_events.team_id` alone can't
distinguish "our event" from "opponent event": the opponent has no team row
(spec §16, "opponent is represented primarily as a TEAM"), so `team_id` is
always ours regardless of who actually did something. Momentum was
single-sided as a result (ROADMAP's Sprint 2 section), and the dashboard had
no defensive/opponent view. The analyst asked for genuine two-team momentum
and a defensive funnel next.

### Decision 1 — `is_opponent boolean`, not a synthetic opponent team row

`is_opponent boolean not null default false` on both `hockey_events` and
`possessions`. `team_id` stays constant either way (it's still a real FK to
*our* `teams` row); `is_opponent` is the actual "whose action is this" flag.
No `opponent_players`/opposition roster table — team-level tagging only,
same boundary ADR-003 already drew for substitutions vs. everything else,
just applied to the whole opponent side instead of one field.

### Decision 2 — no player on an opponent event, enforced in the store

An opponent-tagged event/possession never carries `player_id`,
`secondary_player_id`, or `event_participants` rows — there's no roster to
select from. Enforced in `modules/live-encoding/store.ts`'s `beginDraft()`
and `saveDraft()` (both re-derive `forUs` from `taggingSide` rather than
trusting whatever the draft already had), not a DB constraint — consistent
with capture-level/participant rules elsewhere in this schema being a
client-side concern (ADR-003, Decision 1).

### Decision 3 — `taggingSide`, a sticky store field with a header toggle

`taggingSide: "US" | "OPPONENT"` lives in the live-encoding store the same
way `encodingLevel` does (Decision 1 of ADR-003) — persists across events,
survives an analyst tagging several opponent events in a row without
re-selecting. The live-encoding header gets a "Nous / Eux" segmented
control; switching to "Eux" hides the roster panel and any player-selection
UI in the current-event panel (nothing to show — Decision 2), replaced by a
small "Événement adverse" badge so a fast-moving analyst mid-match can't
lose track of which side is currently being tagged.

### Decision 4 — momentum inverts, it doesn't filter

`computeMomentum` now sums `+weight` for our events and `-weight` for the
opponent's on the same weight table, instead of ignoring opponent events —
a real two-team swing rather than "how well are we doing in isolation."
`computeMatchStats` still excludes opponent events entirely (our score/box
score must never include an opponent's GOAL); the new
`computeOpponentEventCounts` mirrors it for the opponent side, and the match
dashboard gained a symmetric "defensive" section (opponent conversion
funnel, opponent event-count chart) alongside the existing "us" one.

### Decision 5 — bug found while building this: `team_id`-only matching collides

Two existing functions matched a possession's events by `team_id` alone:
`getPossessionEvents` (`sequences.ts`) and the open-possession map in
`computePossessions` (`possession.ts`). Harmless while only one side was
ever tagged; wrong the moment an opponent possession could share the same
`team_id` (it always does, per Decision 1) — an opponent `POSSESSION_START`
would collide with and incorrectly close our own open possession in the
same map slot, and either side's events could leak into the other's
sequence for the conversion funnel. Fixed by matching/keying on
`is_opponent` as well as `team_id` everywhere a possession collects its own
events. `possessionPercentageByTeam` is renamed
`possessionPercentageBySide` (keyed `"us"`/`"opponent"`) since `team_id` was
never a valid grouping key for this — there is only ever one `team_id` in
play.

### What we did not do

- No `opponent_players` table (spec §16's last line, individual opponent
  tagging) — team-level only; ROADMAP issue #1 is now resolved as originally
  scoped, not worked around.
- No opponent-side substitutions, stints, or per-player anything — none of
  that has meaning without an opponent roster.

## ADR-005: live-encoding screen is fullscreen, on its own route group

**Status:** accepted, implemented.

### Context

The live-encoding screen is iPad-only, used mid-match (spec §75/§87,
"watch the match, not the screen"). The analyst reported the pitch
collapsing to a sliver specifically during live coding and asked for the
screen to take up the entire display, with no shared app chrome, to make
that reliable.

### Decision — a dedicated `(live)` route group, not a CSS overlay

`/matches/[matchId]/live` moved from the `(app)` route group to a new
`(live)` group (route groups don't affect the URL — it's unchanged) with
its own minimal layout that bypasses `AppShell` entirely: no sidebar, no
header. The layout uses `h-dvh`, not `100vh`/a `calc()` against an assumed
header height — `dvh` tracks iOS Safari's actual visual viewport as browser
chrome shows/hides, which a fixed subtraction can't.

### Root cause, for the record

Two independent problems compounded into the reported bug:

1. Nested inside `AppShell`, the live screen's own `h-[calc(100vh-3.5rem)]`
   assumed a `3.5rem` header — AppShell's real header is `4rem` (`h-16`)
   plus `<main>`'s own `p-6 lg:p-8`, and AppShell's outer wrapper uses
   `min-h-screen` (a minimum, not a clip), so the mismatch cascaded through
   the flex chain instead of erroring visibly.
2. Even fixed inside its own fullscreen layout, the event-button grid's
   *own* natural height could still starve the pitch: CSS Grid gives every
   independently-wrapping category group in the same row-band one shared
   row height (the tallest group's), easily exceeding 500px across 8
   groups. First fix: capped to `max-h-[40%] overflow-y-auto`, pitch got
   the remainder via `flex-1` — see the update below for why this was
   revised again almost immediately.

### Update — flat button grid, capped pitch, not the other way around

The per-category boxes above were replaced with one flat `auto-fill`/`minmax`
grid (`EventGrid` — no per-category box left to inflate, so no scroll needed
in normal use) before this ADR was a day old, once real use surfaced two
follow-on problems the first fix hadn't touched:

- **Small buttons are a real touch-target problem on iPad**, not just a
  layout one. Buttons are now `min-h-11` (44px+, Apple HIG's minimum), which
  only fits alongside 25 buttons if the grid is flat rather than boxed by
  category (a boxed layout's per-group inflation gets *worse*, not better,
  once each button is taller).
- **The pitch does not deserve "whatever's left."** Re-reviewed against
  actual use: the zone-tap targets are already large/coarse by design
  (§75/§87), so a bigger pitch buys little accuracy, while big buttons and a
  visible current-event panel/timeline are what the analyst actually reads
  and taps constantly mid-match. The pitch is now capped
  (`min-h-[180px] max-h-[40vh]`), not `flex-1`-to-fill — freeing height back
  to the button grid (`max-h-[55%]`) and to the timeline, which now lives
  directly under the pitch (inside the same column) instead of as a 4th
  full-width row, so the space freed by capping the pitch goes to something
  visible rather than becoming a blank gap next to the roster/current-event
  columns.
- **The worst-case width is 1024px, not whatever the dev machine happens to
  be.** A classic 1024×768 iPad in STANDARD/ADVANCED mode (roster panel
  shown) leaves the button grid under 500px wide — verified directly at
  that width, not assumed: 25 buttons at a 5rem column floor still lay out
  as 5×5 with no scroll there. A wider screen or BASIC mode (roster hidden)
  only ever gets easier, never worse — so 1024px is the binding constraint
  the column-width floor is chosen against, not one of several to guess
  between.

### What we did not do

- No CSS-only overlay or Fullscreen API approach — a dedicated route group
  needs no fullscreen permission prompt from the browser, composes normally
  with Next.js layouts and navigation, and doesn't require JS to enter/exit.
- No container queries for the button grid, despite Tailwind v4 supporting
  them — `auto-fill`/`minmax` already sizes columns from the grid's own
  resolved width (not a viewport breakpoint, which was the original bug),
  so container queries would add syntax without fixing anything `auto-fill`
  doesn't already handle correctly.

## Where this lives vs. Carnet Sciences

This is a fully separate project (own repo, own Supabase project, own
dependencies) — the existing `Carnet Sciences` app is unrelated (school
gradebook), living in a different directory. Nothing here should ever import
from or depend on it.
