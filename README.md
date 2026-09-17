# Hockey Trace

A field-hockey performance platform — match analysis and athlete performance
(GPS, heart rate, load, Garmin) in one product. See `docs/PRODUCT_SPEC.md` for
the full picture; this file just gets it running.

The name is a placeholder, configurable via `NEXT_PUBLIC_APP_NAME`.

## Stack

Next.js 16 (App Router, TS strict) · Tailwind v4 + shadcn/ui · Supabase
(Postgres + Auth + RLS) · Zod · Recharts · Zustand.

**Note for future contributors (human or AI):** this Next.js install has real
breaking changes vs. common training-data knowledge — read
`node_modules/next/dist/docs/` before assuming an API. See
`docs/ARCHITECTURE.md` for the specific gotchas already found (Proxy replacing
Middleware, Cache Components being opt-in and deliberately left off, Base UI
instead of Radix under shadcn's `Button`/`Select`/etc — use the `render` prop,
not `asChild`).

## Running without any setup — Demo Mode

If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are left empty,
the whole app runs against fixture data (`src/lib/demo/fixtures.ts`, the same
data as `supabase/seed.sql`) with no login required — proxy.ts skips auth
entirely. This is enough to review every Sprint 1 page and the full live
encoding flow in a browser. A "Demo mode — not saved" badge shows in the
header, and the live encoding page's writes stay in that browser tab's memory
only (nothing persists across a refresh) — see `docs/ARCHITECTURE.md` and
`docs/OFFLINE_STRATEGY.md`.

```bash
npm install
npm run dev
```

Settings pages that mutate data (add team, add player, create match) call a
Server Action that talks to Supabase — those will error in demo mode. Only the
live encoding screen has a demo-mode write path.

## Running against a real Supabase project

1. Create a project at [supabase.com](https://supabase.com) (or run the
   Supabase CLI locally if you have Docker).
2. Copy `.env.example` to `.env.local` and fill in the project URL + anon key
   (Settings → API in the dashboard).
3. Apply the schema: run `supabase/migrations/0001_init.sql` in the SQL
   editor (or `supabase db push` if using the CLI/linked project).
4. Apply demo data: run `supabase/seed.sql` the same way. It's idempotent —
   safe to re-run.
5. Sign up for an account through the app's `/login` page (or create a user
   in the Studio's Authentication tab).
6. Link that user as the demo club's admin — from the SQL editor:
   ```sql
   select app.bootstrap_admin('you@example.com');
   ```
7. `npm run dev` and log in.

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run test     # unit tests (Vitest) — business logic in modules/**/logic
npm run lint     # ESLint
```

## Where things live

See `docs/ARCHITECTURE.md` for the full repository structure. Short version:
routes in `src/app` stay thin; business logic (queries, Server Actions, pure
calculations) lives in `src/modules/<domain>`; shared UI in `src/components`.

## Documentation

- `docs/PRODUCT_SPEC.md` — the product, its domains, its non-negotiable principles.
- `docs/DATA_MODEL.md` — schema and the reasoning behind it.
- `docs/ARCHITECTURE.md` — stack decisions, repo structure, event sourcing, clock engine.
- `docs/PERMISSIONS.md` — roles and the RLS policy design.
- `docs/OFFLINE_STRATEGY.md` — the live-encoding offline outbox.
- `docs/INTEGRATIONS.md` — GPS/Garmin/STATSports adapter plan (not yet implemented).
- `docs/ROADMAP.md` — Sprint 1 scope, acceptance-test mapping, and known open issues.
