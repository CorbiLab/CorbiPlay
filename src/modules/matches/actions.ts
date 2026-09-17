"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_QUARTERS, DEFAULT_QUARTER_DURATION_MINUTES } from "@/config/app";

const createMatchSchema = z.object({
  teamId: z.string().min(1),
  seasonId: z.string().min(1),
  opponentName: z.string().min(1),
  matchDate: z.string().min(1),
  venue: z.string().optional(),
  competition: z.string().optional(),
  homeOrAway: z.enum(["HOME", "AWAY"]),
});

export interface CreateMatchState {
  error?: string;
}

export async function createMatch(_prev: CreateMatchState, formData: FormData): Promise<CreateMatchState> {
  const parsed = createMatchSchema.safeParse({
    teamId: formData.get("teamId"),
    seasonId: formData.get("seasonId"),
    opponentName: formData.get("opponentName"),
    matchDate: formData.get("matchDate"),
    venue: formData.get("venue") || undefined,
    competition: formData.get("competition") || undefined,
    homeOrAway: formData.get("homeOrAway"),
  });

  if (!parsed.success) {
    return { error: "Merci de vérifier les champs du formulaire." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      team_id: parsed.data.teamId,
      season_id: parsed.data.seasonId,
      opponent_name: parsed.data.opponentName,
      match_date: parsed.data.matchDate,
      venue: parsed.data.venue ?? null,
      competition: parsed.data.competition ?? null,
      home_or_away: parsed.data.homeOrAway,
      number_of_quarters: DEFAULT_QUARTERS,
      quarter_duration_minutes: DEFAULT_QUARTER_DURATION_MINUTES,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/matches");
  redirect(`/matches/${data.id}`);
}

const updateMatchSchema = z.object({
  matchId: z.string().min(1),
  opponentName: z.string().min(1),
  matchDate: z.string().min(1),
  venue: z.string().optional(),
  competition: z.string().optional(),
  homeOrAway: z.enum(["HOME", "AWAY"]),
});

export interface UpdateMatchState {
  error?: string;
}

export async function updateMatch(_prev: UpdateMatchState, formData: FormData): Promise<UpdateMatchState> {
  const parsed = updateMatchSchema.safeParse({
    matchId: formData.get("matchId"),
    opponentName: formData.get("opponentName"),
    matchDate: formData.get("matchDate"),
    venue: formData.get("venue") || undefined,
    competition: formData.get("competition") || undefined,
    homeOrAway: formData.get("homeOrAway"),
  });
  if (!parsed.success) return { error: "Merci de vérifier les champs du formulaire." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({
      opponent_name: parsed.data.opponentName,
      match_date: parsed.data.matchDate,
      venue: parsed.data.venue ?? null,
      competition: parsed.data.competition ?? null,
      home_or_away: parsed.data.homeOrAway,
    })
    .eq("id", parsed.data.matchId);
  if (error) return { error: error.message };

  revalidatePath(`/matches/${parsed.data.matchId}`);
  revalidatePath("/matches");
  return {};
}

/**
 * Hard delete — unlike players/teams, a match has no `active` flag to soft-
 * delete with. `matches.id` is a `sporting_sessions.id` FK with `on delete
 * cascade`, and match_rosters/player_stints/hockey_events/possessions all
 * cascade from `matches` too, so this cleanly removes every dependent row —
 * confirmed destructive on purpose in the UI (DeleteMatchButton).
 */
export async function deleteMatch(matchId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) return { error: error.message };

  revalidatePath("/matches");
  return {};
}

/**
 * Post-match enrichment (ADR-003/HOCKEY_ANALYTICS.md "Post-match enrichment,
 * concretely") — assigns a player to a single-participant event created
 * without one (e.g. a BASIC-coded BALL_WIN). Same event id, never a
 * duplicate row. Mirrors the live store's patchEvent, but as a plain Server
 * Action: this runs from the post-match review page, outside any live
 * encoding session, so it has no Zustand store or offline outbox to go
 * through — it writes straight to Supabase like every other action here.
 */
export async function enrichEventPlayer(eventId: string, playerId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: event, error: fetchError } = await supabase
    .from("hockey_events")
    .select("enrichment_status, match_id")
    .eq("id", eventId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!event) return { error: "Événement introuvable." };

  const { error } = await supabase
    .from("hockey_events")
    .update({
      player_id: playerId,
      enrichment_status: event.enrichment_status === "RAW" ? "PARTIAL" : event.enrichment_status,
    })
    .eq("id", eventId);
  if (error) return { error: error.message };

  revalidatePath(`/matches/${event.match_id}/review`);
  return {};
}

/** Same idea for a MULTIPLE-participant event (PRESS) — appends participants, never replaces or duplicates. */
export async function enrichEventParticipants(eventId: string, playerIds: string[], roles: string[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: event, error: fetchError } = await supabase
    .from("hockey_events")
    .select("enrichment_status, match_id")
    .eq("id", eventId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!event) return { error: "Événement introuvable." };

  const { data: existing, error: countError } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId);
  if (countError) return { error: countError.message };
  const startIndex = existing?.length ?? 0;

  const rows = playerIds.map((playerId, i) => ({
    event_id: eventId,
    player_id: playerId,
    role: roles[i] ?? roles[roles.length - 1] ?? "OTHER",
    order_index: startIndex + i,
  }));

  const { error: insertError } = await supabase.from("event_participants").insert(rows);
  if (insertError) return { error: insertError.message };

  if (event.enrichment_status === "RAW") {
    const { error: statusError } = await supabase.from("hockey_events").update({ enrichment_status: "PARTIAL" }).eq("id", eventId);
    if (statusError) return { error: statusError.message };
  }

  revalidatePath(`/matches/${event.match_id}/review`);
  return {};
}

const setRosterSchema = z.object({
  matchId: z.string().min(1),
  playerIds: z.array(z.string()).max(16),
  starterIds: z.array(z.string()),
  goalkeeperId: z.string().optional(),
});

export async function setMatchRoster(input: z.infer<typeof setRosterSchema>) {
  const parsed = setRosterSchema.parse(input);
  const supabase = await createClient();

  await supabase.from("match_rosters").delete().eq("match_id", parsed.matchId);

  const rows = parsed.playerIds.map((playerId) => ({
    match_id: parsed.matchId,
    player_id: playerId,
    starter: parsed.starterIds.includes(playerId),
    goalkeeper: playerId === parsed.goalkeeperId,
  }));

  const { error } = await supabase.from("match_rosters").insert(rows);
  if (error) throw error;

  revalidatePath(`/matches/${parsed.matchId}`);
}
