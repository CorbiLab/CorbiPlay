"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setSessionRpe(
  sportingSessionId: string,
  playerId: string,
  durationMin: number,
  rpe: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("session_rpe_entries")
    .upsert(
      { sporting_session_id: sportingSessionId, player_id: playerId, duration_min: durationMin, rpe },
      { onConflict: "player_id,sporting_session_id" }
    );
  if (error) return { error: error.message };

  revalidatePath(`/training/${sportingSessionId}`);
  revalidatePath("/performance/load");
  return {};
}

export interface WellnessPatch {
  sleep_quality: number | null;
  fatigue: number | null;
  muscle_soreness: number | null;
  stress: number | null;
  motivation: number | null;
  pain_flag: boolean;
}

export async function setWellnessEntry(playerId: string, date: string, patch: WellnessPatch): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("wellness_entries")
    .upsert({ player_id: playerId, date, ...patch }, { onConflict: "player_id,date" });
  if (error) return { error: error.message };

  revalidatePath("/performance/wellness");
  return {};
}
