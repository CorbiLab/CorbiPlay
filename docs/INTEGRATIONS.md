# External Integrations

## Principle (spec §89)

Never fake a working integration. Where credentials/APIs are unavailable now
(all of them, at Sprint 1): ship the adapter interface, an import pipeline
that works on real files a user uploads, and fixtures clearly labelled as
demo/mock — never presented in the UI as "synced from provider."

## Provider adapter interface

See ARCHITECTURE.md §Provider adapters for the `AthleteDataProvider`
interface. No implementation ships in Sprint 1; `external_athlete_identities`
and the `external_provider` enum (`STATSPORTS, GARMIN, CATAPULT, POLAR`) exist
in the schema so linking a player to a provider ID doesn't require a migration
later.

## STATSports (Sprint 3)

Phase 1 is CSV import, not an API integration (no official STATSports API
access is assumed available). Planned pipeline (spec §62), not built yet:

```
UPLOAD CSV → DETECT FORMAT/COLUMNS → MAP ATHLETES → MAP METRICS → VALIDATE → PREVIEW → IMPORT
```

`StatsportsImporter` will live in `modules/integrations/statsports/`. Unknown
columns are preserved via the generic `performance_metrics` table
(`metric_key`, `metric_label`, `value`, `unit`) rather than dropped or forcing
a schema change per CSV variant.

## Garmin (Sprint 5)

Only implemented once Garmin Connect Developer credentials are actually
available to the club (Garmin's Health API requires an approved partner
application — this is not something to build against speculatively). Until
then: the adapter interface + `athlete_daily_metrics` schema are ready, no
code calls any Garmin endpoint, and no UI claims a Garmin connection exists.

## Catapult / Polar

Same posture as Garmin — interface and schema ready (`external_provider` enum
already includes them), no implementation until real API access exists.

## Video (Sprint 7)

`hockey_events.video_id` / `.video_timestamp_ms` (nullable) already exist in
the schema — reserved ahead of time, unread by anything today. Still needed
before this is a feature: a `videos` table referencing a storage location
(Supabase Storage or an external host — decided when this sprint starts,
since video storage cost at club scale is a real product decision, not a
technical default) and the upload/linking flow itself.

**Not scoped, flagged for later discussion:** a Catapult blog post
(catapult.com/fr/blog/field-hockey-focus-analyse-video-ncaa) mentions a
Boston College coach livestreaming to the sideline mid-match for in-game
adjustments. That's a different capability from the above — real-time video
capture/transmission to a bench device, not linking a past event to a video
timestamp — and a different product category from event-tagging analytics
(camera hardware, encoding, latency, a second screen). Noted here so it
isn't lost, not committed to any sprint.
