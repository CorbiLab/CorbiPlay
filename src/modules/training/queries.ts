import "server-only";
import { isSupabaseConfigured } from "@/config/app";
import { createClient } from "@/lib/supabase/server";
import type { Player, TrainingAttendance, TrainingSession } from "@/types/database";

// No demo fixtures yet (Sprint 3 build, 2026) — every function here returns
// an empty result in demo mode rather than fabricating sessions, same as any
// other list query would for a club that genuinely has none yet.
export async function listTrainingSessionsForTeam(teamId: string): Promise<TrainingSession[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("team_id", teamId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as TrainingSession[];
}

export async function getTrainingSession(sessionId: string): Promise<TrainingSession | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("training_sessions").select("*").eq("id", sessionId).maybeSingle();
  return (data as TrainingSession) ?? null;
}

export interface AttendanceEntry {
  player: Player;
  attendance: TrainingAttendance;
}

export async function getTrainingAttendance(sessionId: string): Promise<AttendanceEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_attendance")
    .select("*, player:players(*)")
    .eq("training_session_id", sessionId);
  if (error) throw error;
  return (data as unknown as (TrainingAttendance & { player: Player })[]).map(({ player, ...attendance }) => ({
    player,
    attendance,
  }));
}
