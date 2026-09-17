# Hockey Analytics

This document is the tactical-analytics complement to PRODUCT_SPEC.md and
DATA_MODEL.md: it explains how Hockey Trace goes from isolated `hockey_events`
rows to sequence-level tactical analysis, without turning Sprint 1 into the
whole analytics product. See ADR-002 in ARCHITECTURE.md for the schema
decisions this document assumes.

**Status as of this document:** schema-ready. Nothing described below as
"Sprint 2+" is wired into any screen yet — no new live-encoding button, no
post-match review UI, no KPI dashboard. What exists today: the columns/tables,
and a set of pure analytics functions in
`src/modules/analytics/logic/sequences.ts` that already work over whatever
data those future features eventually write.

## The analytical hierarchy

```
MATCH
  └─ POSSESSION / SEQUENCE      (possessions — one row per continuous spell of control)
       └─ HOCKEY EVENTS         (hockey_events — the existing tagged actions)
            └─ TACTICAL CONTEXT (possessions.tactical_context, .attack_type)
                 └─ OUTCOME     (possessions.outcome — POSITIVE/NEUTRAL/NEGATIVE)
                      └─ DERIVED KPIs (computed on read, never stored)
```

This is a conceptual hierarchy, not four tables. Only `possessions` was added
as a real materializable layer (it already existed in the schema, unused);
tactical context and outcome are columns on it, and KPIs are always computed,
never a table of numbers.

## Event model (unchanged)

`hockey_events` is still the sole source of truth — no counters, no cached
stats. Additions:

- `is_opponent` (`boolean`, default `false`) — the real "our event or
  theirs" flag; `team_id` is always ours (no opponent team row exists), so
  it can't serve that purpose on its own. See "Opponent-side tagging" below
  and ADR-004 in ARCHITECTURE.md.
- `possession_id` (nullable FK to `possessions`) — which sequence this event
  belongs to, once something populates it.
- `pressure_context` (nullable text: see `tactical-vocabulary.ts`) — optional,
  never required at live encoding.
- `capture_level` (`"BASIC" | "STANDARD" | "ADVANCED"`, default `"STANDARD"`)
  — what the analyst was asked for when this row was created. See "Encoding
  levels" below and ADR-003 in ARCHITECTURE.md.
- `enrichment_status` (`"RAW" | "PARTIAL" | "ENRICHED" | "REVIEWED"`,
  default `"RAW"`) — has this event been looked at again since it was
  created live? Bumped automatically by `patchEvent`/`addEventParticipants`
  when a player is attached after the fact; never hand-set elsewhere.

Exact normalized `(start_x, start_y, end_x, end_y)` on 0–100 axes remain the
spatial source of truth; `match_elapsed_ms`/`absolute_timestamp` remain the
temporal source of truth. Every spatial/temporal derivation (zone, lane, high
ball win, defensive turnover, transition duration) is computed from these,
never stored redundantly.

## Encoding levels (ADR-003)

Sprint 1's live-encoding screen assumed one analyst always selects a player
for every event. That doesn't hold for a solo analyst covering a match, or
lighter live coding when staffing is short — so the live screen now exposes
a BASIC / STANDARD / ADVANCED switch (always visible, switches instantly,
touches nothing else in the match state).

**The three levels are the same data model at different capture detail, not
three products.** Switching levels changes what the analyst is asked to
enter; it never changes how an event is stored, and it never makes a
previously-saved event stop making sense. Concretely:

- **BASIC** — player attribution is never even nudged (`resolvePlayerRequirement`
  always returns `OPTIONAL`); the roster panel collapses so pitch/event
  buttons get the space instead (a "Joueurs" button peeks at it without
  switching levels). One analyst can code an entire match: tap the event,
  tap the pitch, done.
- **STANDARD** — Sprint 1's original screen: persistent player selection,
  roster visible, player attribution "recommended" for the types that
  support it.
- **ADVANCED** — same screen as STANDARD today (no exclusive layout yet —
  see ADR-003 "What we did not do"); the meaningful difference currently
  available is PRESS's full multi-participant flow and post-match
  enrichment, both usable regardless of level.

A BASIC-coded match is not incomplete data — it's intentionally
lower-granularity data, and the two must never be conflated (spec §25):
100% of team-level events with zero player attribution is a perfectly valid,
analyzable match.

## PRESS — a first-class tactical concept, not `pressure = HIGH`

PRESS (the team's defensive organisation/action) and *pressure*
(`hockey_events.pressure_context` — how much the ball carrier feels
pressured) are different concepts, kept structurally separate (ADR-003).

PRESS is a real `event_type`/`event_category`, and the one event type in
Sprint 1 with `participantSelectionMode: "MULTIPLE"` — any number of players
can be tapped in the roster panel (no dropdown, no search: the same
touch-first roster grid every other event uses), each becoming an
`event_participants` row with role `PRESSER` (first tapped) or
`PRESS_SUPPORT` (every one after). Its outcome
(`BALL_WIN`/`FORCED_BACKWARD`/`FORCED_LONG_BALL`/`BROKEN`/`NO_EFFECT` —
`SUGGESTED_PRESS_OUTCOMES`) lives in `metadata.pressOutcome`, not the
generic 3-value `event_outcome` enum, so distinct outcomes never collapse
into each other. Nothing about PRESS blocks a save except the pitch tap —
"PRESS → pitch → saved" works with zero players and no outcome, in every
encoding level.

## Multi-player events — `event_participants`

Any event can in principle involve more than one player (PRESS today;
future PC units). `event_participants(id, event_id, player_id, role,
order_index, metadata, created_at)` records that without widening
`hockey_events` with more nullable player columns. `hockey_events.player_id`/
`.secondary_player_id` stay exactly as they were for every other event type
— see ADR-003 Decision 3 for why this is additive rather than a replacement.

## Post-match enrichment, concretely

A BASIC-coded `BALL_WIN` with no player is enriched later by calling
`patchEvent(eventId, { player_id })` — same event id, `enrichment_status`
moves `RAW → PARTIAL` automatically. A BASIC PRESS with no participants is
enriched by `addEventParticipants(eventId, [playerIds])`, appending rows to
the same event rather than creating a new one. Both are real, tested store
actions today; the polished "tap a timeline entry to enrich it" screen is
Sprint 2+ (ADR-003 "What we did not do").

## Opponent-side tagging (ADR-004)

`team_id` on `hockey_events`/`possessions` is always *ours* — the opponent
has no team row (spec §16), so it can never be the "our event vs. theirs"
flag. `is_opponent` is: a plain boolean, default `false`, on both tables.

- **No opponent roster.** An opponent-tagged event/possession never carries
  `player_id`, `secondary_player_id`, or `event_participants` — enforced in
  the live-encoding store, not a DB constraint. There's nothing to attribute
  it to below the team level, by design.
- **`taggingSide: "US" | "OPPONENT"`** in the live-encoding store (same
  sticky pattern as `encodingLevel`) drives a "Nous / Eux" toggle in the
  header. Switching to "Eux" hides the roster panel and any
  player-selection UI, and the current-event panel shows an "Événement
  adverse" badge instead — one glance tells the analyst which side they're
  about to save, without reading the toggle itself mid-match.
- **Momentum inverts, doesn't filter.** `computeMomentum` adds our events'
  weight and subtracts the opponent's on the same table — a genuine
  two-team swing, not "our events in isolation." `computeMatchStats` still
  filters opponent events out entirely (the box score/our score must never
  include one of theirs); `computeOpponentEventCounts` is the mirror for
  the opponent side, feeding the dashboard's "defensive" section (opponent
  conversion funnel + opponent event-count chart, alongside the existing
  "us" ones).
- **`team_id`-only matching was a latent bug here.** Both
  `getPossessionEvents` (below) and `computePossessions`'s open-possession
  map matched/keyed by `team_id` alone — fine while only one side was ever
  tagged, wrong the instant an opponent possession shares the same
  `team_id` (it always does): an opponent `POSSESSION_START` would close
  our own open possession, and either side's events could leak into the
  other's funnel sequence. Both now also match/key on `is_opponent`.
  `possessionPercentageByTeam` is renamed `possessionPercentageBySide`
  (`"us"`/`"opponent"`) since `team_id` was never a valid grouping key here.

Not done: an `opponent_players` table for individual opponent tagging
(spec §16's last line) — team-level only, as originally scoped.

## Possession / sequence model

`possessions` (existing table, extended):

| Column | Purpose |
|---|---|
| `start_match_elapsed_ms` / `end_match_elapsed_ms` | Temporal window — `end` is null while the sequence is still open. |
| `start_timestamp` / `end_timestamp` | Wall-clock mirror of the above, for consistency with `hockey_events.absolute_timestamp`. |
| `start_x`/`start_y`/`end_x`/`end_y` | Where the sequence began/ended. |
| `possession_start_type` | How it began — see `SUGGESTED_POSSESSION_START_TYPES`. |
| `attack_type` | `ESTABLISHED_ATTACK` / `COUNTER_ATTACK` / `SET_PIECE` / `OTHER` (or a club's own labels) — belongs to the whole sequence, entered once, not per event. |
| `tactical_context` | Club-defined phase label (`OUTLET`, `HIGH_PRESS`, ...). |
| `outcome` | Sequence-level `POSITIVE` / `NEUTRAL` / `NEGATIVE` — **different from** `hockey_events.outcome` (`SUCCESS`/`FAIL`/`NEUTRAL`, per event). An outlet that reaches Entry 25 is a positive *sequence*, independent of whether any individual pass inside it was tagged FAIL. |
| `metadata` | Escape hatch for whatever a future feature needs without a migration. |

Not stored: `duration_ms` (always `end_match_elapsed_ms - start_match_elapsed_ms`,
via `getSequenceDurationMs()`).

**Decided (Sprint 2): option 1, live-tagged.** `POSSESSION_START`/`POSSESSION_END`
are now ordinary live-encoding buttons; the store's `saveDraft()` materializes
a real `possessions` row on `POSSESSION_START`, closes it on the matching
`POSSESSION_END`, and stamps `possession_id` on every event tagged in
between — finally using the FK ADR-003 reserved for this. Chosen over the
other two because it needed zero new UI beyond two event types the schema
already reserved for it:

1. ~~Live-tag `POSSESSION_START`/`POSSESSION_END`~~ — **shipped**.
2. A post-match review screen where an analyst draws sequence boundaries over
   the existing event timeline (spec §35's "post-match enrichment") — not
   ruled out, could still complement live-tagging for matches coded without it.
3. Automatic inference from event patterns — still explicitly deferred, "do
   not implement speculative automatic classification."

`modules/analytics/logic/possession.ts`'s `computePossessions()` is
unchanged and still derives possession *intervals* (for the possession-%
stat) from the same event pairs — the two coexist deliberately (dashboard
page comment explains why): intervals for timing, materialized rows for
anything that needs a stable sequence identity (the conversion funnel,
attack-type/tactical-context classification).

`modules/analytics/logic/sequences.ts`'s functions still find a possession's
events by **time window + team + side** (`getPossessionEvents`), not by
requiring `possession_id` — the FK is populated now, but nothing reads it
yet; it's there for a future faster lookup, not a blocker that was
resolved. "+ side" (`is_opponent`) was added by ADR-004 — `team_id` alone
can't tell an opponent possession's events from ours, since it's always
the same `team_id` (see "Opponent-side tagging" above).

## Tactical context & attack type

Deliberately club-configurable, deliberately not enums (ADR-002, decision 1).
`tactical-vocabulary.ts` exports suggested lists for a future picker UI:

- `SUGGESTED_POSSESSION_START_TYPES`
- `SUGGESTED_ATTACK_TYPES`
- `SUGGESTED_TACTICAL_CONTEXTS`
- `SUGGESTED_SEQUENCE_OUTCOMES`
- `SUGGESTED_PRESSURE_CONTEXTS`

None of these are read by any screen yet.

## Spatial analytics

`modules/live-encoding/logic/pitch-zones.ts` (existing, unchanged) is the
single place pitch geometry is defined: `getPitchZone(x, y, attackingDirection)`
returns one of nine zones plus `CIRCLE`, given an `AttackingDirection` of
`"LEFT" | "RIGHT"`. Everything spatial in `sequences.ts` reuses this instead
of re-deriving zones.

`matches.attacking_directions` (new, nullable JSONB: `{ "1": "LEFT_TO_RIGHT", ... }`)
is where a per-quarter direction would live once something needs it — nothing
reads it yet, since no analytics function currently needs to resolve
direction *per event* automatically (callers pass `AttackingDirection`
explicitly today). This is the schema hook spec §20 asks for, kept inert
until a real caller needs it.

Two derived concepts, implemented as pure functions over already-tagged events
— no new event type, no new live-encoding button:

- `isHighBallWin(event, attackingDirection)` — a `BALL_WIN` recovered in the
  attacking half or circle.
- `isDefensiveTurnover(event, attackingDirection)` — a `TURNOVER` conceded in
  one's own defensive 25.

## Transition & funnel analytics

`sequences.ts` exports the building blocks:

- `getPossessionEvents(possession, events)` — a sequence's events, in order.
- `getSequenceDurationMs(possession)`
- `didSequenceReachEntry25` / `didSequenceReachCircle` / `didSequenceGenerateShot`
  / `didSequenceGenerateChance` / `didSequenceGenerateGoal`
- `timeToFirstEventType(possession, events, type)` — e.g. time from a
  `BALL_WIN` to the sequence's first `SHOT`.
- `computeConversionFunnel(possessions, events, stageDefs?)` — the default
  POSSESSION → ENTRY_25 → CIRCLE_ENTRY → SHOT → CHANCE → GOAL funnel, with
  count, `pctOfPrevious`, and `pctOfPossessions` per stage. `stageDefs` is
  overridable, so a team's own funnel shape doesn't need a new function.

All of these are exercised in `sequences.test.ts`, and `computeConversionFunnel`
is now wired into the match dashboard twice — once over our own possessions,
once over `possessions.filter(p => p.is_opponent)` for the defensive funnel
(ADR-004).

## KPI architecture

`kpi_definitions` (new table, inert): a declarative KPI is `calculation_type`
(one of a fixed set of app-known calculators — never arbitrary code) plus a
`configuration` JSONB blob of that calculator's parameters. Example shape for
a future `HIGH_BALL_WIN_TO_SHOT` KPI:

```json
{
  "startEvent": "BALL_WIN",
  "startZone": "ATTACKING_HALF",
  "targetEvent": "SHOT",
  "samePossession": true
}
```

`club_id`/`team_id` are both nullable: a club-wide default has `team_id`
null; a team overriding or adding its own KPI sets `team_id`. No calculation
engine reads this table yet — building it means picking the first handful of
`calculation_type`s and implementing each as a pure function, the same shape
as everything in `sequences.ts`. That's future work, not a schema decision.

`team_game_models` (new table, inert): one JSONB config blob per team, for
whatever a future game-model editor decides to store (pinned KPIs, tactical
labels in use, thresholds). No editor exists yet.

## Live vs. post-match enrichment

Nothing described in this document adds a live-encoding input. Every new
column is nullable and either:

- derived automatically (zones, high ball win, defensive turnover, duration,
  funnel counts), or
- filled in later — a post-match review screen (not built), tagged from
  video, or left blank.

This directly answers spec §42's review question for every concept in this
document: the analyst is never asked to enter tactical context, attack type,
or pressure while watching a live match.

## Future physical/tactical synchronisation

Not implemented — flagged here because the schema already supports it
without change. `hockey_events.match_elapsed_ms` and `possessions.start/end_match_elapsed_ms`
share the same clock as `player_stints` and (once Sprint 3 lands GPS/HR)
`athlete_physical_sessions`. A future query like "physical intensity during
successful counter attacks" is a time-range join across those tables — no new
column required on any of them for that join to work.

**Explicitly out of scope for that future work:** asserting causation. If
turnovers correlate with a period of high physical load, the app may show
that relationship; it must not claim fatigue *caused* the turnovers without a
justified model. Descriptive analytics only (spec §40).

## Final review — can this schema answer the target questions without a redesign?

| # | Question | Answer without redesign? |
|---|---|---|
| 1 | How many possessions did a team have? | **Yes** — `count(*) from possessions where team_id = … and is_opponent = false` (`team_id` alone isn't enough, ADR-004), or `computePossessions()` for the event-derived interval count today. |
| 2 | How many started in the defensive 25? | **Yes** — `getPitchZone(start_x, start_y, direction)` on `possessions.start_x/y`. |
| 3 | How many reached the attacking 25? | **Yes** — `didSequenceReachEntry25`. |
| 4 | How many reached the circle? | **Yes** — `didSequenceReachCircle`. |
| 5 | How many generated a shot? | **Yes** — `didSequenceGenerateShot`. |
| 6 | How many generated a goal? | **Yes** — `didSequenceGenerateGoal`. |
| 7 | % of defensive outlets resulting in a successful Entry 25? | **Yes** — filter `possessions` by `possession_start_type`/`tactical_context` = an outlet label, then `didSequenceReachEntry25` rate. Needs Sprint 2 to actually populate that column; the query shape doesn't change once it is. |
| 8 | Which side generated the most Circle Entries? | **Yes** — `getPitchZone`'s lane (`_LEFT`/`_CENTER`/`_RIGHT`) on the `CIRCLE_ENTRY` event's coordinates. |
| 9 | Where did a team lose the ball most often? | **Yes** — `isDefensiveTurnover`/zone histogram over `TURNOVER` events. |
| 10 | Which players generated the most high Ball Wins? | **Yes** — `isHighBallWin` filtered by `event.player_id`, grouped and counted. |
| 11 | How many high Ball Wins generated a Shot within 10s? | **Yes** — `isHighBallWin` to find the event, its possession via time window, `timeToFirstEventType(..., "SHOT")` ≤ 10 000 ms. |
| 12 | Counter attacks vs. established attacks effectiveness? | **Yes, once `attack_type` is populated** — group `computeConversionFunnel` by `possessions.attack_type`. Schema-ready today; needs Sprint 2's write path. |
| 13 | Differences between Q1–Q4? | **Yes** — every event/possession already carries `quarter`; every function above accepts a pre-filtered list. |
| 14 | Which players contributed to successful sequences? | **Yes** — `getPossessionEvents` lists every event (and its `player_id`) in a sequence; "successful" = `didSequenceGenerateShot`/`outcome`. |
| 15 | What happened during each player's actual stints? | **Yes, already possible today** — `player_stints` + `getMatchElapsedMs` windows, independent of this document's additions. |
| 16 | Can sequences sync with GPS/HR/video later? | **Yes** — see "Future physical/tactical synchronisation" above; shared clock, no schema change needed. |
| 17 | Can each team configure its own KPIs without a DB change? | **Yes** — `kpi_definitions`/`team_game_models` exist for exactly this; only the calculation engine and editor UI remain to be built, not the schema. |

All seventeen: **yes**. Decision: continue Sprint 1 as scoped (live match,
16-player roster, clock, substitutions, stints, events, timeline, undo, basic
stats) on the schema described in this document and ADR-002 — no further
database redesign needed to build Sprint 2's tactical analytics.
