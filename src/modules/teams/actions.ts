"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const createTeamSchema = z.object({
  clubId: z.string().min(1),
  seasonId: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().optional(),
  ageCategory: z.string().optional(),
  gender: z.string().optional(),
});

export interface CreateTeamState {
  error?: string;
}

export async function createTeam(_prev: CreateTeamState, formData: FormData): Promise<CreateTeamState> {
  const parsed = createTeamSchema.safeParse({
    clubId: formData.get("clubId"),
    seasonId: formData.get("seasonId"),
    name: formData.get("name"),
    shortName: formData.get("shortName") || undefined,
    ageCategory: formData.get("ageCategory") || undefined,
    gender: formData.get("gender") || undefined,
  });
  if (!parsed.success) return { error: "Merci de vérifier les champs du formulaire." };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    club_id: parsed.data.clubId,
    season_id: parsed.data.seasonId,
    name: parsed.data.name,
    short_name: parsed.data.shortName ?? null,
    age_category: parsed.data.ageCategory ?? null,
    gender: parsed.data.gender ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings/teams");
  return {};
}

const updateTeamSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().optional(),
  ageCategory: z.string().optional(),
  gender: z.string().optional(),
});

export interface UpdateTeamState {
  error?: string;
}

export async function updateTeam(_prev: UpdateTeamState, formData: FormData): Promise<UpdateTeamState> {
  const parsed = updateTeamSchema.safeParse({
    teamId: formData.get("teamId"),
    name: formData.get("name"),
    shortName: formData.get("shortName") || undefined,
    ageCategory: formData.get("ageCategory") || undefined,
    gender: formData.get("gender") || undefined,
  });
  if (!parsed.success) return { error: "Merci de vérifier les champs du formulaire." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({
      name: parsed.data.name,
      short_name: parsed.data.shortName ?? null,
      age_category: parsed.data.ageCategory ?? null,
      gender: parsed.data.gender ?? null,
    })
    .eq("id", parsed.data.teamId);
  if (error) return { error: error.message };

  revalidatePath("/settings/teams");
  revalidatePath(`/teams/${parsed.data.teamId}`);
  return {};
}

/**
 * Soft delete: same pattern as `archivePlayer` (players/actions.ts) — a team
 * with any match history keeps it (matches/rosters/events aren't touched),
 * this just hides the team from the switcher, roster pickers, and
 * `listTeams` (which already filters on `active`). Existing matches stay
 * reachable directly by URL.
 */
export async function archiveTeam(teamId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").update({ active: false }).eq("id", teamId);
  if (error) return { error: error.message };

  revalidatePath("/settings/teams");
  return {};
}
