import { clearSynced, listPending, markSynced, type OutboxRecord } from "./outbox";

export type SyncStatus = "SYNCED" | "SYNCING" | "OFFLINE";

export interface SyncDeps {
  /** Perform the actual Supabase write for one outbox record; throw on network failure. */
  applyRecord: (record: OutboxRecord) => Promise<void>;
}

/**
 * Drains the outbox in order, stopping at the first failure rather than
 * reordering — hockey events must land in the order they happened (see
 * docs/OFFLINE_STRATEGY.md "Conflict strategy"). Safe to call repeatedly
 * (e.g. on an interval, and on the browser's `online` event).
 */
export async function drainOutbox(deps: SyncDeps): Promise<SyncStatus> {
  const pending = await listPending();
  if (pending.length === 0) return "SYNCED";

  for (const record of pending) {
    try {
      await deps.applyRecord(record);
      await markSynced(record.id);
    } catch {
      return "OFFLINE";
    }
  }

  await clearSynced();
  return "SYNCED";
}
