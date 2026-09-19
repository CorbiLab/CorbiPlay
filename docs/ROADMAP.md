# Roadmap

Sprints 2-7 are as specified in the master prompt and not repeated in full
here — only Sprint 1's scope, its acceptance mapping, and issues worth flagging
now (so later sprints don't inherit avoidable debt).

## Sprint 1

- Next.js/Tailwind/shadcn foundation, Supabase project wiring, RLS policies, full schema.
- Club, Season, Team, Player, TeamMembership CRUD (minimal UI — Settings pages).
- Match creation, 16-player roster (11 on field / 5 bench), match clock (quarters,
  start/pause/resume/end), substitutions, `PlayerStint`, time-on-pitch.
- `<HockeyPitch />`, pitch-zone derivation.
- Live tagging: BALL_WIN, TURNOVER, ENTRY_25, CIRCLE_ENTRY, SHOT, CHANCE,
  PC_WON, GOAL (+ discipline cards, interception/tackle/deflection — cheap to
  include alongside the MVP list since they share the same event-definition
  mechanism).
- Persistent player selection, undo, edit/delete event, live timeline.
- Basic match statistics + match dashboard (score, possession stub, quarter
  events list) — the *full* dashboard (funnel, momentum, heatmaps) is Sprint 2;
  Sprint 1 only needs enough to satisfy its own acceptance test (§85 item 38).
- Offline-first outbox for live encoding (see OFFLINE_STRATEGY.md).
- Demo data: Waterloo Ducks, 4 teams, 16 U16 players incl. Théo (#8, dual
  membership), Leopold U16 opponent, one demo match with realistic events.
- Unit tests per spec §78 (clock, zones, event validation, stats, possession,
  stints, time-on-pitch, substitutions).

### Explicitly deferred past Sprint 1 (not because they're hard, but because the
spec itself sequences them later and Sprint 1 must stay reviewable)

- Full match dashboard visuals (funnel/momentum/heatmaps) → Sprint 2.
- Any GPS/HR/training/load UI → Sprint 3/4 (schema exists now, per DATA_MODEL.md).
- Garmin, video → Sprint 5/7.
- CSV import UI → Sprint 3 (adapter interface documented now, INTEGRATIONS.md).

## Tactical analytics readiness (pre-Sprint-2, schema only)

The tactical-analytics complementary spec (possessions/sequences, attack
types, tactical context, configurable KPIs, conversion funnels) was reviewed
against the schema before it became harder to change — see ADR-002 in
ARCHITECTURE.md and the full model in HOCKEY_ANALYTICS.md. Outcome: the
schema needed additive changes (`possessions` gained classification columns,
`hockey_events` gained `possession_id`/`pressure_context`, two new inert
tables `kpi_definitions`/`team_game_models`), all shipped at the time; no
feature work, no live-encoding changes, no dashboard changes were done then.

## Sprint 2: possessions materialized, full match dashboard

Picked the live-tagged mechanism for creating real `possessions` rows
(HOCKEY_ANALYTICS.md's option 1) — `POSSESSION_START`/`POSSESSION_END` are
now buttons on the live-encoding grid, and `possession_id` gets stamped on
every event tagged in between. Built on top of that: a real conversion
funnel (`computeConversionFunnel`), a momentum chart, and a spatial heatmap,
all on the match dashboard. Momentum started single-team (issue #1 below was
still open at the time); it became genuine two-team rolling event-weight
score once opponent-side tagging shipped (ADR-004), see
`modules/analytics/logic/momentum.ts`.

Also fixed in passing: live-encoding event ids were generated as
`local-<uuid>` and inserted as-is into `hockey_events.id` (a Postgres `uuid`
column) — invalid syntax, so every event created against a real Supabase
project failed to insert, silently and permanently (retried forever as
"OFFLINE"). Never caught because nothing before this had exercised live
encoding against a real, authenticated backend. Ids are now bare UUIDs.

## Encoding levels + multi-player events (pre-Sprint-2 review, shipped now)

An elite-analyst review of the live-encoding UX flagged that assuming a
player selection for every event doesn't hold for a solo analyst or lighter
staffing. Reviewed against the schema and shipped now (not deferred, unlike
the tactical-analytics readiness above) because it changes Sprint 1's own
live-encoding screen: a BASIC/STANDARD/ADVANCED switch (player attribution
never required outside substitutions), a PRESS event type with full
multi-player support (`event_participants`), and post-match enrichment
actions (`patchEvent`/`addEventParticipants`) that assign players after the
fact without duplicating the event. See ADR-003 in ARCHITECTURE.md and
HOCKEY_ANALYTICS.md. Deferred at the time: a dedicated ADVANCED-only screen
layout (still true — ADVANCED renders identically to STANDARD), and a
post-match review screen — since built: `/matches/[matchId]/review`
(`event-review-list.tsx`) lists every event and lets an analyst tap a
player onto one tagged without any, exactly what `patchEvent`/
`addEventParticipants` were built for.

## Opponent-side tagging + live-encoding fullscreen (shipped now)

Two asks from the analyst, handled together since the second surfaced while
testing the first on an iPad:

- **Opponent-side event/possession tagging** — closes issue #1 below for
  real (was resolved with `team_id`, which turned out not to work; see
  ADR-004 in ARCHITECTURE.md). A `is_opponent boolean` on `hockey_events`/
  `possessions`, a "Nous / Eux" toggle in the live-encoding header, genuine
  two-team momentum, and a defensive/opponent section on the match
  dashboard (conversion funnel + event counts). Found and fixed in the same
  pass: `getPossessionEvents`/`computePossessions` matched on `team_id`
  alone, which silently mixed up our and the opponent's sequences the
  moment both existed (ADR-004, Decision 5).
- **Live-encoding screen is genuinely fullscreen on iPad** — the analyst
  reported the pitch collapsing to a sliver mid-match. Moved to its own
  `(live)` route group with no `AppShell` chrome, and capped the
  event-button grid so it can't starve the pitch of space. See ADR-005 in
  ARCHITECTURE.md for the two compounding root causes.

## Sprint 1 acceptance walkthrough

Mapped against the spec's own §85 list (1–41). Each numbered item there
corresponds to: login page → team switcher → squad list → demo match →
`/matches/[id]/live` → 16-player lineup (11+5, no opponent roster) → start Q1 →
select Théo → BALL_WIN + pitch tap (auto-saved) → ENTRY_25 without reselecting
→ SHOT + outcome → GOAL (score + timeline update) → substitution (stint closes,
time-on-pitch computed, selection cleared/reassigned) → undo → end Q1/start
Q2/finish match → match dashboard from events → Théo's athlete profile showing
club-level identity + both memberships. Each of these is a concrete page/action
in the file list in ARCHITECTURE.md — nothing in the acceptance test requires
functionality outside the Sprint 1 scope above.

## Issues worth flagging in the master spec (so they don't become silent debt)

1. **§16/§85 "not see a permanent list of 16 opposition players"** vs. §23
   `hockey_events.secondary_player_id` — for events like an opposition
   turnover the analyst still needs to attribute *something* to the other
   team. **Resolved (ADR-004):** `team_id` can't do this — it's always ours,
   the opponent has no team row — so a plain `is_opponent boolean` was added
   instead (`hockey_events` and `possessions`), and opponent-tagged rows
   simply leave `player_id`/`event_participants` empty (team-level tagging
   only), consistent with §16's "opponent is represented primarily as a
   TEAM." A first draft of this used `team_id` itself as the flag, which
   turned out to be wrong the moment two sides shared one `team_id` (see
   ADR-004, Decision 5, for the possession/sequence bug that caused).
   Individual opponent tagging (§16 last line) would still need an
   `opponent_players` table later — not created now.
2. **Momentum formula (§37) and match-reference load (§57) are explicitly
   "configurable" but the spec doesn't say where config lives.** Sprint 1
   keeps both as typed constants in `modules/analytics/momentum.ts` /
   `modules/performance/match-reference.ts` (not DB-editable) since no UI to
   edit them is requested before later sprints — flagged so nobody assumes a
   Settings page for this exists yet.
3. **Speed/HR zones "may exist at club/team/athlete level, athlete overrides"**
   (§48) implies a most-specific-wins resolution function; this is trivial
   over 3 tables but needs exactly one implementation
   (`modules/performance/logic/resolve-zones.ts`) — flagging now so a future
   sprint doesn't duplicate the resolution logic per feature that needs zones.
4. **`membership_type` includes `TRAINING_ONLY`**, but `match_rosters`
   references `players` directly (not `team_memberships`) per the
   architecture rule in DATA_MODEL.md. That's intentional (guests can play
   without a membership row) but means match-roster eligibility is **not**
   enforced by the schema — it's a UI-level convenience filter only. If the
   product later needs "a TRAINING_ONLY player can never appear in a match
   roster" as a hard rule, that's a check to add in the Server Action, not the DB.
5. **Minors + wellness/HR data**: PERMISSIONS.md notes GDPR/consent workflow is
   out of scope technically for Sprint 1. This is a legal/product gap, not an
   engineering one — flagging so it's tracked before the product handles real
   athlete health data, not discovered at launch.
