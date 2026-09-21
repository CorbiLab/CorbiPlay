import "server-only";
import { isSupabaseConfigured } from "@/config/app";
import { createClient } from "@/lib/supabase/server";
import type { SessionRpeEntry, WellnessEntry } from "@/types/database";
import type { DailyLoadEntry } from "@/modules/performance/logic/load";

// No demo fixtures yet (Sprint 4 build, 2026) — same posture as
// modules/training/queries.ts: an empty result in demo mode, not a
// fabricated one.

export async function getSessionRpeEntries(sportingSessionId: string): Promise<SessionRpeEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("session_rpe_entries").select("*").eq("sporting_session_id", sportingSessionId);
  if (error) throw error;
  return data as SessionRpeEntry[];
}

/**
 * Every RPE entry for the whole team over the last `days`, grouped by
 * player — one round trip for the squad rather than one per player.
 * `date` is the *session's* calendar date (sporting_sessions.session_date),
 * not the entry's created_at, so a load logged late still lands on the day
 * the session actually happened.
 */
export async function listDailyLoadByPlayer(teamId: string, days = 28): Promise<Map<string, DailyLoadEntry[]>> {
  const byPlayer = new Map<string, DailyLoadEntry[]>();
  if (!isSupabaseConfigured()) return byPlayer;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_rpe_entries")
    .select("player_id, session_load, sporting_session:sporting_sessions!inner(team_id, session_date)")
    .eq("sporting_session.team_id", teamId)
    .gte("sporting_session.session_date", since.toISOString().slice(0, 10));
  if (error) throw error;
  for (const row of data as unknown as { player_id: string; session_load: number; sporting_session: { session_date: string } }[]) {
    const list = byPlayer.get(row.player_id) ?? [];
    list.push({ date: row.sporting_session.session_date, sessionLoad: row.session_load });
    byPlayer.set(row.player_id, list);
  }
  return byPlayer;
}

export async function getWellnessForDate(playerIds: string[], date: string): Promise<Map<string, WellnessEntry>> {
  if (!isSupabaseConfigured() || playerIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wellness_entries")
    .select("*")
    .in("player_id", playerIds)
    .eq("date", date);
  if (error) throw error;
  return new Map((data as WellnessEntry[]).map((entry) => [entry.player_id, entry]));
}
