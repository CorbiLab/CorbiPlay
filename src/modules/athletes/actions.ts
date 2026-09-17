"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PLAYER_POSITIONS } from "./position-labels";

const createPlayerSchema = z.object({
  clubId: z.string().min(1),
  teamId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().optional(),
  shirtNumber: z.coerce.number().int().positive().optional(),
  positions: z.array(z.enum(PLAYER_POSITIONS)),
  membershipType: z.enum(["PERMANENT", "TEMPORARY", "GUEST", "TRAINING_ONLY"]),
  confirmDuplicate: z.coerce.boolean().optional(),
});

export interface CreatePlayerState {
  error?: string;
  duplicateWarning?: string;
}

export async function createPlayer(_prev: CreatePlayerState, formData: FormData): Promise<CreatePlayerState> {
  const parsed = createPlayerSchema.safeParse({
    clubId: formData.get("clubId"),
    teamId: formData.get("teamId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate") || undefined,
    shirtNumber: formData.get("shirtNumber") || undefined,
    positions: formData.getAll("positions"),
    membershipType: formData.get("membershipType") || "PERMANENT",
    confirmDuplicate: formData.get("confirmDuplicate") || undefined,
  });
  if (!parsed.success) return { error: "Merci de vérifier les champs du formulaire." };

  const supabase = await createClient();

  // Every list in the app shows only the first name, so two players sharing
  // one are otherwise indistinguishable — surfacing an exact first+last name
  // match here is the only place this can be caught (spec: no dedup on
  // display, so it has to happen on creation instead).
  if (!parsed.data.confirmDuplicate) {
    const { data: existing } = await supabase
      .from("players")
      .select("id")
      .eq("club_id", parsed.data.clubId)
      .eq("active", true)
      .ilike("first_name", parsed.data.firstName)
      .ilike("last_name", parsed.data.lastName)
      .maybeSingle();
    if (existing) {
      return {
        duplicateWarning: `Un joueur nommé ${parsed.data.firstName} ${parsed.data.lastName} existe déjà dans le club.`,
      };
    }
  }

  const { data: player, error } = await supabase
    .from("players")
    .insert({
      club_id: parsed.data.clubId,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      display_name: parsed.data.firstName,
      birth_date: parsed.data.birthDate ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { error: membershipError } = await supabase.from("team_memberships").insert({
    team_id: parsed.data.teamId,
    player_id: player.id,
    shirt_number: parsed.data.shirtNumber ?? null,
    positions: parsed.data.positions,
    membership_type: parsed.data.membershipType,
  });
  if (membershipError) return { error: membershipError.message };

  revalidatePath("/settings/players");
  revalidatePath("/athletes");
  return {};
}

const updatePlayerSchema = z.object({
  playerId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  displayName: z.string().optional(),
  birthDate: z.string().optional(),
});

export interface UpdatePlayerState {
  error?: string;
}

export async function updatePlayer(_prev: UpdatePlayerState, formData: FormData): Promise<UpdatePlayerState> {
  const parsed = updatePlayerSchema.safeParse({
    playerId: formData.get("playerId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    displayName: formData.get("displayName") || undefined,
    birthDate: formData.get("birthDate") || undefined,
  });
  if (!parsed.success) return { error: "Merci de vérifier les champs du formulaire." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      display_name: parsed.data.displayName || parsed.data.firstName,
      birth_date: parsed.data.birthDate ?? null,
    })
    .eq("id", parsed.data.playerId);
  if (error) return { error: error.message };

  revalidatePath(`/athletes/${parsed.data.playerId}`);
  revalidatePath("/athletes");
  revalidatePath("/settings/players");
  return {};
}

/**
 * Soft delete: a player who ever appeared in a match keeps their historical
 * stats/events, so we never hard-delete — this just hides them from active
 * squad lists and roster pickers (spec's `active` flag, same pattern as
 * teams/seasons).
 */
export async function archivePlayer(playerId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("players").update({ active: false }).eq("id", playerId);
  if (error) return { error: error.message };

  revalidatePath("/athletes");
  revalidatePath("/settings/players");
  return {};
}

/**
 * Persists the photo URL after the browser has already uploaded the file
 * straight to Supabase Storage (see athletes/photo-upload.tsx) — this action
 * only writes the resulting public URL onto the player row, through the
 * normal RLS-protected path, same as every other player mutation.
 */
export async function updatePlayerPhoto(playerId: string, photoUrl: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("players").update({ photo_url: photoUrl }).eq("id", playerId);
  if (error) return { error: error.message };

  revalidatePath(`/athletes/${playerId}`);
  revalidatePath("/athletes");
  return {};
}
