"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPlayersForTeam } from "@/modules/athletes/queries";
import type { AttendanceStatus } from "@/types/database";

const createTrainingSessionSchema = z.object({
  teamId: z.string().min(1),
  date: z.string().min(1),
  sessionType: z.enum(["RECOVERY", "TECHNICAL", "TACTICAL", "CONDITIONING", "GYM", "MATCH_PREP", "OTHER"]),
  title: z.string().optional(),
  description: z.string().optional(),
  plannedLoad: z.coerce.number().optional(),
});

export interface CreateTrainingSessionState {
  error?: string;
}

export async function createTrainingSession(
  _prev: CreateTrainingSessionState,
  formData: FormData
): Promise<CreateTrainingSessionState> {
  const parsed = createTrainingSessionSchema.safeParse({
    teamId: formData.get("teamId"),
    date: formData.get("date"),
    sessionType: formData.get("sessionType"),
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    plannedLoad: formData.get("plannedLoad") || undefined,
  });
  if (!parsed.success) return { error: "Merci de vérifier les champs du formulaire." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_sessions")
    .insert({
      team_id: parsed.data.teamId,
      date: parsed.data.date,
      session_type: parsed.data.sessionType,
      title: parsed.data.title ?? null,
      description: parsed.data.description ?? null,
      planned_load: parsed.data.plannedLoad ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Pre-populate one PLANNED attendance row per currently active roster
  // player, same reasoning as a match roster starting from the squad list —
  // the coach corrects individual statuses from there rather than adding
  // each player one by one on session day.
  const roster = await listPlayersForTeam(parsed.data.teamId);
  if (roster.length > 0) {
    await supabase.from("training_attendance").insert(
      roster.map((player) => ({ training_session_id: data.id, player_id: player.id, status: "PLANNED" as const }))
    );
  }

  revalidatePath("/training");
  redirect(`/training/${data.id}`);
}

const updateTrainingSessionSchema = z.object({
  sessionId: z.string().min(1),
  date: z.string().min(1),
  sessionType: z.enum(["RECOVERY", "TECHNICAL", "TACTICAL", "CONDITIONING", "GYM", "MATCH_PREP", "OTHER"]),
  title: z.string().optional(),
  description: z.string().optional(),
  plannedLoad: z.coerce.number().optional(),
});

export interface UpdateTrainingSessionState {
  error?: string;
}

export async function updateTrainingSession(
  _prev: UpdateTrainingSessionState,
  formData: FormData
): Promise<UpdateTrainingSessionState> {
  const parsed = updateTrainingSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    date: formData.get("date"),
    sessionType: formData.get("sessionType"),
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    plannedLoad: formData.get("plannedLoad") || undefined,
  });
  if (!parsed.success) return { error: "Merci de vérifier les champs du formulaire." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_sessions")
    .update({
      date: parsed.data.date,
      session_type: parsed.data.sessionType,
      title: parsed.data.title ?? null,
      description: parsed.data.description ?? null,
      planned_load: parsed.data.plannedLoad ?? null,
    })
    .eq("id", parsed.data.sessionId);
  if (error) return { error: error.message };

  revalidatePath(`/training/${parsed.data.sessionId}`);
  revalidatePath("/training");
  return {};
}

// Hard delete, like deleteMatch — training_sessions.id is a sporting_sessions
// FK with `on delete cascade`, so training_attendance/physical_sessions rows
// for it cascade away too.
export async function deleteTrainingSession(sessionId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("training_sessions").delete().eq("id", sessionId);
  if (error) return { error: error.message };

  revalidatePath("/training");
  return {};
}

export async function setAttendanceStatus(
  sessionId: string,
  playerId: string,
  status: AttendanceStatus
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("training_attendance")
    .upsert({ training_session_id: sessionId, player_id: playerId, status }, { onConflict: "training_session_id,player_id" });
  if (error) return { error: error.message };

  revalidatePath(`/training/${sessionId}`);
  return {};
}
