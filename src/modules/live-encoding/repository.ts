import { createClient } from "@/lib/supabase/browser";
import { drainOutbox, type SyncStatus } from "./offline/sync";
import { enqueue, type OutboxKind, type OutboxRecord } from "./offline/outbox";

/**
 * The only place live encoding talks to Supabase — always from the browser
 * client, never a Server Action (see docs/OFFLINE_STRATEGY.md for why: it
 * lets the outbox retry without the Next.js server being reachable at all).
 */
async function applyRecord(record: OutboxRecord): Promise<void> {
  const supabase = createClient();

  switch (record.kind) {
    case "INSERT_EVENT": {
      const { error } = await supabase.from("hockey_events").insert(record.payload as never);
      if (error) throw error;
      return;
    }
    case "UPDATE_EVENT": {
      const { id, patch } = record.payload as { id: string; patch: Record<string, unknown> };
      const { error } = await supabase.from("hockey_events").update(patch).eq("id", id);
      if (error) throw error;
      return;
    }
    case "DELETE_EVENT": {
      const { id } = record.payload as { id: string };
      const { error } = await supabase
        .from("hockey_events")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return;
    }
    case "INSERT_EVENT_PARTICIPANTS": {
      const { error } = await supabase.from("event_participants").insert(record.payload as never);
      if (error) throw error;
      return;
    }
    case "UPSERT_POSSESSION": {
      const { error } = await supabase.from("possessions").upsert(record.payload as never);
      if (error) throw error;
      return;
    }
    case "UPSERT_STINT": {
      const { error } = await supabase.from("player_stints").upsert(record.payload as never);
      if (error) throw error;
      return;
    }
    case "UPDATE_MATCH_CLOCK": {
      const { matchId, patch } = record.payload as { matchId: string; patch: Record<string, unknown> };
      const { error } = await supabase.from("matches").update(patch).eq("id", matchId);
      if (error) throw error;
      return;
    }
  }
}

export async function queueWrite(kind: OutboxKind, payload: unknown): Promise<void> {
  await enqueue(kind, payload);
}

export async function trySync(): Promise<SyncStatus> {
  return drainOutbox({ applyRecord });
}
