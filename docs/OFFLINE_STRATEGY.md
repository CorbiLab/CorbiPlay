# Offline Strategy (Live Encoding)

Spec §71: a hockey pitch may have poor connectivity; live match data must
never be lost. This is about the **live encoding screen specifically** — the
rest of the app (dashboards, settings) is a normal online Next.js app and does
not need offline support in Sprint 1.

## Why not just flip on Next 16's `experimental.useOffline`

Next 16 ships an experimental `useOffline` flag + `next/offline` hook that
retries a stuck Server Action/navigation once connectivity returns (see
`node_modules/next/dist/docs/01-app/02-guides/offline-support.md`). It's
tempting, but it doesn't fit here:

- It requires Cache Components (or at minimum route-level `loading.tsx`
  boundaries) and is explicitly experimental.
- It only retries **one in-flight request** — it has no concept of a queue of
  N events tagged while offline, ordering between them, or a "SYNCED /
  SYNCING / OFFLINE" indicator per spec §71.
- Live encoding writes go **directly from the browser to Supabase**
  (`@supabase/supabase-js` client-side, RLS-protected), not through a Server
  Action at all — see ARCHITECTURE.md — so there's no Server Action round-trip
  for it to retry in the first place.

Instead we build the small, purpose-fit thing the spec asks for ("Sprint 1 can
implement a pragmatic first version").

## Design

1. **Local-first state.** The live-encoding Zustand store
   (`modules/live-encoding/store.ts`) is the immediate source of truth for the
   UI: current lineup, selected player, match clock anchor, and the in-memory
   event timeline. Every user action updates this store **synchronously** —
   the UI never waits on a network round-trip to show an event in the timeline.
2. **Outbox queue in IndexedDB.** Every mutation (event insert/update/delete,
   substitution, quarter transition) is appended to an IndexedDB-backed outbox
   (`modules/live-encoding/offline/outbox.ts`, using the native `indexedDB`
   API directly — one small wrapper, not a dependency) as a `{ id, kind,
   payload, createdAt }` record, **before** attempting the network write. This
   survives a page refresh or a crashed tab.
3. **Sync loop.** A single sync worker (`modules/live-encoding/offline/sync.ts`,
   run from a `useEffect` in the live encoding page) drains the outbox in
   order: pops the oldest pending record, attempts the corresponding Supabase
   write, marks it `synced` on success, and stops on the first *retryable*
   failure (network error) rather than reordering — hockey events must land
   in the order they happened. It retries with backoff on: `online` browser
   event, every 5s while any record is pending, and once immediately on mount.

   **A retryable failure is not the only kind, found the hard way**: a
   record whose `hockey_events.match_id` pointed at a match deleted after it
   was queued got a Postgres foreign-key violation (`23503`) on every retry,
   forever — and because the loop stopped there, every real event tagged
   after it stayed stuck behind it for the rest of the match, silently.
   `isPermanentError` (sync.ts) now recognises Postgres integrity-constraint
   violations (`23xxx`) and RLS/permission denials (`42501`) as *unrecoverable*
   — retrying the exact same write will never succeed — and the loop marks
   that record `failed` (a third `OutboxRecord.status`, distinct from
   `pending`/`synced`) and moves on instead of blocking. `SYNCED_WITH_ERRORS`
   surfaces this in the header badge; the failed record's error is logged to
   the console (`listFailed()`, outbox.ts) since there's no dedicated review
   UI for it yet. A second, related fix: `INSERT_EVENT`/
   `INSERT_EVENT_PARTICIPANTS` now `upsert` instead of a bare `insert` — a
   write that actually succeeded server-side but whose response never
   reached the client (a dropped connection, not just a slow one) looks
   identical to a failed one from here, and retrying it as a plain insert
   hit the row's own primary key and produced the exact same kind of stuck
   queue, just from a different cause.
4. **Conflict strategy: last-writer-wins per row, ordered by client
   timestamp.** Two analysts are not expected to tag the same match
   simultaneously in Sprint 1 (single-analyst live encoding is the assumed
   workflow per spec §29); if that changes later, the append-only nature of
   `hockey_events` means concurrent inserts never conflict — only edits/deletes
   of the same event could, and we accept last-write-wins for that rare case
   rather than building CRDT-style merge logic now.
5. **UI states**, shown as a small badge in the live encoding header:
   - `SYNCED` — outbox empty, last sync succeeded.
   - `SYNCING` — outbox has pending records, currently online.
   - `OFFLINE` — `navigator.onLine` is false, or the last write attempt failed
     with a network error (more reliable indicator is "last attempt failed",
     since `navigator.onLine` can be a false positive on captive portals).
   - `SYNCED_WITH_ERRORS` — outbox otherwise empty, but at least one record
     was permanently unrecoverable (see `isPermanentError` above) and got
     dropped rather than retried forever.

## What this buys, and what it doesn't (yet)

- Buys: a full quarter can be tagged with zero connectivity and syncs
  automatically once the iPad reconnects; nothing is lost on tab crash/reload
  because the outbox is in IndexedDB, not memory.
- Does not yet buy: multi-device sync during a live match (two iPads tagging
  the same match), full PWA installability / service-worker asset caching
  (spec §71 prepares for PWA; a `manifest.json` + icons are added in Sprint 1
  for installability, but a service worker for offline **app-shell** loading —
  as opposed to offline **data** writes, which is what's built now — is
  deferred until the UI is stable enough to be worth precaching).

## Testing

`modules/live-encoding/offline/outbox.test.ts` and `sync.test.ts` run against
`fake-indexeddb` (dev dependency) so the queue/ordering/retry logic is unit
tested without a browser.
