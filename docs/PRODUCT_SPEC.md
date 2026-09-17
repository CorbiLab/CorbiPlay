# Hockey Trace — Product Specification

`Hockey Trace` is a placeholder name, configurable via `NEXT_PUBLIC_APP_NAME` (see `src/config/app.ts`).

## What this product is

A field-hockey performance operating system for an entire club, combining two
pillars that must never be built as separate apps bolted together:

1. **Hockey performance** — match tagging, live encoding, match/team analytics.
2. **Athlete performance** — GPS, heart rate, Garmin, wellness, RPE, load monitoring.

Both pillars share the same underlying structure — every derived number
(stats, load, momentum) is computed from raw events/measurements, never
stored as a hand-maintained counter. That structure is **not** a single
linear chain. It's a tree with two branches under Club, plus one cross-cutting
relationship:

```
Club
├── Players / Athletes        (permanent club-level identity)
└── Seasons
    └── Teams
        ├── Matches
        └── Training Sessions

Player ↔ Team  via TeamMembership (cross-cutting — not containment)
```

A player is never a child of a team. `TeamMembership` is the only place a
player and a team connect, which is what lets a player hold several
memberships at once (e.g. primary on U16, temporary on U19) and keep the same
identity — and the same load history — across seasons. See
[DATA_MODEL.md](DATA_MODEL.md#club-tree-vs-team-membership-the-two-shapes-that-matter)
for the full reasoning and how the schema enforces it.

## Non-negotiable principles (carried into every design decision below)

1. Live encoding must be fast enough that the analyst watches the match, not the iPad.
2. Match data and physical data belong to the same athlete identity, always.
3. Hockey events, GPS, HR, video and substitutions must share one clock so they're
   time-alignable later, even though only hockey events are built in Sprint 1.
4. Time on pitch ≠ match duration (rolling substitutions).
5. Built for a whole club, not one team; a player belongs to the **club**, not
   permanently to a team.
6. GPS/Garmin providers are adapters behind an interface — never hardcoded.
7. Raw events/measurements are the source of truth; dashboards are derived views.
8. No invented medical/injury-risk scores — only descriptive load bands.

## Domains

- **Club** — top-level tenant. Directly owns both branches below: players and seasons.
- **Player** — permanent club-level identity, owned directly by Club, not by
  any team. Survives season changes, team changes, and multiple concurrent
  team memberships without ever changing `player_id`.
- **Team Membership** — the only place a player and a team are connected
  (PERMANENT / TEMPORARY / GUEST / TRAINING_ONLY), with start/end dates so a
  player can hold multiple concurrent memberships (e.g. primary U16 + temporary U19).
  This is a cross-cutting link, not a containment relationship — it's what
  lets the same player show up under two different teams at once.
- **Season → Team** — the other branch under Club. A team belongs to exactly
  one club+season and owns matches and training sessions.
- **Match** — one team's fixture; opponent is a lightweight name/logo, not a
  full roster (MVP analyses our own club team only).
- **Match Roster / Player Stint** — the 16-player selection for a match and the
  timestamped on-pitch/on-bench intervals derived from substitutions.
- **Hockey Event** — the append-only, editable/undoable log that all match
  statistics are derived from.
- **Possession / Sequence** — a continuous spell of team control grouping
  several Hockey Events, optionally classified (attack type, tactical
  context, sequence outcome) so tactical analysis reasons about sequences,
  not isolated events. Schema-ready (ADR-002); no live/dashboard UI yet — see
  [HOCKEY_ANALYTICS.md](HOCKEY_ANALYTICS.md).
- **Encoding level** — BASIC / STANDARD / ADVANCED, switched instantly on
  the live-encoding screen without losing match state. Changes what the
  analyst is asked to enter (player attribution is never required outside
  substitutions), never how an event is stored — one solo analyst can code
  a whole match in BASIC. See ADR-003 in [ARCHITECTURE.md](ARCHITECTURE.md).
- **Training Session / Attendance** — the training-side equivalent of a match.
- **Physical Session / Athlete Physical Session** — GPS/HR aggregate metrics
  attached to either a match or a training session (never both).
- **Load Management** — rolling load windows, RPE, wellness, Garmin dailies,
  athlete-specific match reference loads — always athlete-scoped, aggregating
  across every team the athlete has touched.

See [DATA_MODEL.md](DATA_MODEL.md) for the full schema and
[ARCHITECTURE.md](ARCHITECTURE.md) for how the codebase is organised around
these domains.

## Design priority

iPad landscape (live encoding) → Desktop (analysis) → iPad portrait → Mobile.
Touch targets ≥ 44px on every live-encoding control. Colour never carries
meaning alone (icon + text + colour).

## What Sprint 1 actually ships

See [ROADMAP.md](ROADMAP.md#sprint-1) for the scoped feature list and
[Sprint 1 acceptance walkthrough](ROADMAP.md#sprint-1-acceptance-walkthrough)
mapped against the spec's own acceptance test.
