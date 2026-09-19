import { clearSynced, listFailed, listPending, markFailed, markSynced, type OutboxRecord } from "./outbox";

export type SyncStatus = "SYNCED" | "SYNCING" | "OFFLINE" | "SYNCED_WITH_ERRORS";

export interface SyncDeps {
  /** Perform the actual Supabase write for one outbox record; throw on network failure. */
  applyRecord: (record: OutboxRecord) => Promise<void>;
}

/**
 * A Postgres integrity-constraint violation (SQLSTATE class 23 — foreign
 * key, unique, not-null, check) or an RLS/permission denial (42501) will
 * fail identically no matter how many times the exact same write is
 * retried — e.g. a hockey_events row whose match_id points at a match that
 * was since deleted. Treating these the same as a dropped connection (retry
 * forever) is what let one bad record block an entire match's worth of
 * events behind it, silently, with the analyst never told why. Anything
 * else (network error, timeout, a transient 5xx) is assumed retryable.
 */
export function isPermanentError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (!code) return false;
  return code.startsWith("23") || code === "42501";
}

/**
 * Drains the outbox in order, stopping at the first *retryable* failure —
 * hockey events must land in the order they happened (see
 * docs/OFFLINE_STRATEGY.md "Conflict strategy"). A permanent failure is
 * marked "failed" and skipped instead: it can never succeed, so leaving it
 * at the front of the queue would just block every real event tagged after
 * it. Safe to call repeatedly (e.g. on an interval, and on the browser's
 * `online` event).
 */
export async function drainOutbox(deps: SyncDeps): Promise<SyncStatus> {
  const pending = await listPending();
  if (pending.length === 0) return (await listFailed()).length > 0 ? "SYNCED_WITH_ERRORS" : "SYNCED";

  for (const record of pending) {
    try {
      await deps.applyRecord(record);
      await markSynced(record.id);
    } catch (error) {
      if (isPermanentError(error)) {
        const message = (error as { message?: string } | null)?.message ?? String(error);
        await markFailed(record.id, message);
        continue;
      }
      return "OFFLINE";
    }
  }

  await clearSynced();
  return (await listFailed()).length > 0 ? "SYNCED_WITH_ERRORS" : "SYNCED";
}
