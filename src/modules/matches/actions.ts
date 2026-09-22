"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_QUARTERS, DEFAULT_QUARTER_DURATION_MINUTES } from "@/config/app";
import { parseClock } from "@/modules/matches/logic/clock";

// Both formats are "N equal periods of M minutes" — the schema already models
// exactly that (number_of_quarters/quarter_duration_minutes), so halves is
// just number_of_quarters=2 with its own duration, not a new column. The
// format choice only decides what N defaults to; the analyst still types the
// actual minutes per period, since that varies by competition/age category.
const MATCH_FORMAT_PERIODS: Record<"QUARTERS" | "HALVES", number> = { QUARTERS: 4, HALVES: 2 };

const createMatchSchema = z.object({
  teamId: z.string().min(1),
  seasonId: z.string().min(1),
  opponentName: z.string().min(1),
  matchDate: z.string().min(1),
  venue: z.string().optional(),
  competition: z.string().optional(),
  homeOrAway: z.enum(["HOME", "AWAY"]),
  matchFormat: z.enum(["QUARTERS", "HALVES"]),
  periodDurationMinutes: z.coerce.number().int().positive(),
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
    matchFormat: formData.get("matchFormat"),
    periodDurationMinutes: formData.get("periodDurationMinutes"),
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
      number_of_quarters: MATCH_FORMAT_PERIODS[parsed.data.matchFormat] ?? DEFAULT_QUARTERS,
      quarter_duration_minutes: parsed.data.periodDurationMinutes ?? DEFAULT_QUARTER_DURATION_MINUTES,
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
  matchFormat: z.enum(["QUARTERS", "HALVES"]).optional(),
  periodDurationMinutes: z.coerce.number().int().positive().optional(),
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
    matchFormat: formData.get("matchFormat") || undefined,
    periodDurationMinutes: formData.get("periodDurationMinutes") || undefined,
  });
  if (!parsed.success) return { error: "Merci de vérifier les champs du formulaire." };

  const supabase = await createClient();

  // The clock (getMatchElapsedMs) assumes every period is the same length —
  // changing the format once quarters have actually started playing would
  // silently corrupt every already-recorded event's match-elapsed time, so
  // the form only sends these fields while the match is still SCHEDULED/
  // WARMUP, and this re-checks that server-side rather than trusting the UI.
  let formatPatch: { number_of_quarters: number; quarter_duration_minutes: number } | null = null;
  if (parsed.data.matchFormat && parsed.data.periodDurationMinutes) {
    const { data: current } = await supabase.from("matches").select("status").eq("id", parsed.data.matchId).single();
    if (current && (current.status === "SCHEDULED" || current.status === "WARMUP")) {
      formatPatch = {
        number_of_quarters: MATCH_FORMAT_PERIODS[parsed.data.matchFormat],
        quarter_duration_minutes: parsed.data.periodDurationMinutes,
      };
    }
  }

  const { error } = await supabase
    .from("matches")
    .update({
      opponent_name: parsed.data.opponentName,
      match_date: parsed.data.matchDate,
      venue: parsed.data.venue ?? null,
      competition: parsed.data.competition ?? null,
      home_or_away: parsed.data.homeOrAway,
      ...formatPatch,
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

export interface SetMatchVideoState {
  error?: string;
}

/**
 * Just a link (matches.video_url) plus, per quarter, how far into that
 * video the quarter's clock hit 00:00 — see modules/matches/logic/video.ts
 * for why match_elapsed_ms alone can't do this. `offset_q<N>` fields are
 * read up to `numberOfQuarters`; a blank one is simply omitted, not an
 * error — a coach may only have timed the quarters they've reviewed so far.
 */
export async function setMatchVideo(_prev: SetMatchVideoState, formData: FormData): Promise<SetMatchVideoState> {
  const matchId = String(formData.get("matchId") ?? "");
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const numberOfQuarters = Number(formData.get("numberOfQuarters") ?? 0);

  if (!matchId) return { error: "Match introuvable." };
  if (videoUrl) {
    try {
      new URL(videoUrl);
    } catch {
      return { error: "L'adresse de la vidéo n'est pas une URL valide." };
    }
  }

  const periodAbbrev = numberOfQuarters === 2 ? "MT" : "Q";
  const offsetsMs: Record<string, number> = {};
  for (let quarter = 1; quarter <= numberOfQuarters; quarter++) {
    const raw = String(formData.get(`offsetQ${quarter}`) ?? "").trim();
    if (!raw) continue;
    const ms = parseClock(raw);
    if (ms == null) return { error: `Format invalide pour le début du ${periodAbbrev}${quarter} — attendu mm:ss.` };
    offsetsMs[String(quarter)] = ms;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ video_url: videoUrl || null, video_quarter_offsets_ms: offsetsMs })
    .eq("id", matchId);
  if (error) return { error: error.message };

  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/review`);
  revalidatePath(`/matches/${matchId}/dashboard`);
  return {};
}
