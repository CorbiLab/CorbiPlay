import "server-only";
import { isSupabaseConfigured } from "@/config/app";
import { createClient } from "@/lib/supabase/server";
import {
  demoEventParticipants,
  demoHockeyEvents,
  demoMatches,
  demoMatchRosters,
  demoPlayers,
  demoPlayerStints,
  demoPossessions,
} from "@/lib/demo/fixtures";
import type { EventParticipant, HockeyEvent, Match, MatchRoster, Player, PlayerStint, Possession } from "@/types/database";

export async function listMatchesForTeam(teamId: string): Promise<Match[]> {
  if (!isSupabaseConfigured()) {
    return demoMatches.filter((m) => m.team_id === teamId).sort((a, b) => (a.match_date < b.match_date ? 1 : -1));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", teamId)
    .order("match_date", { ascending: false });
  if (error) throw error;
  return data as Match[];
}

export async function getMatch(matchId: string): Promise<Match | null> {
  if (!isSupabaseConfigured()) return demoMatches.find((m) => m.id === matchId) ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  return (data as Match) ?? null;
}

export interface RosterEntry {
  player: Player;
  roster: MatchRoster;
}

export async function getMatchRoster(matchId: string): Promise<RosterEntry[]> {
  if (!isSupabaseConfigured()) {
    return (demoMatchRosters[matchId] ?? []).map((roster) => ({
      player: demoPlayers.find((p) => p.id === roster.player_id)!,
      roster,
    }));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_rosters")
    .select("*, player:players(*)")
    .eq("match_id", matchId);
  if (error) throw error;
  return (data as unknown as (MatchRoster & { player: Player })[]).map(({ player, ...roster }) => ({
    player,
    roster,
  }));
}

export async function getHockeyEvents(matchId: string): Promise<HockeyEvent[]> {
  if (!isSupabaseConfigured()) {
    return demoHockeyEvents.filter((e) => e.match_id === matchId).sort((a, b) => a.match_elapsed_ms - b.match_elapsed_ms);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hockey_events")
    .select("*")
    .eq("match_id", matchId)
    .order("match_elapsed_ms");
  if (error) throw error;
  return data as HockeyEvent[];
}

/** Participants of every hockey_event in a match (PRESS today) — see ADR-003. */
export async function getEventParticipants(matchId: string): Promise<EventParticipant[]> {
  if (!isSupabaseConfigured()) {
    const eventIds = new Set(demoHockeyEvents.filter((e) => e.match_id === matchId).map((e) => e.id));
    return demoEventParticipants.filter((p) => eventIds.has(p.event_id));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_participants")
    .select("*, event:hockey_events!inner(match_id)")
    .eq("event.match_id", matchId);
  if (error) throw error;
  return (data as unknown as (EventParticipant & { event: unknown })[]).map((row) => {
    const { id, event_id, player_id, role, order_index, metadata, created_at } = row;
    return { id, event_id, player_id, role, order_index, metadata, created_at };
  });
}

/** Real materialized possession/sequence rows for a match (ADR-003) — empty until the analyst tags POSSESSION_START/END live. */
export async function getPossessions(matchId: string): Promise<Possession[]> {
  if (!isSupabaseConfigured()) {
    return demoPossessions.filter((p) => p.match_id === matchId).sort((a, b) => a.start_match_elapsed_ms - b.start_match_elapsed_ms);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("possessions").select("*").eq("match_id", matchId).order("start_match_elapsed_ms");
  if (error) throw error;
  return data as Possession[];
}

/** Every hockey event involving this player, across every match — used by the athlete profile (spec §63/§65). */
export async function getHockeyEventsForPlayer(playerId: string): Promise<HockeyEvent[]> {
  if (!isSupabaseConfigured()) {
    return demoHockeyEvents.filter((e) => e.player_id === playerId || e.secondary_player_id === playerId);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hockey_events")
    .select("*")
    .or(`player_id.eq.${playerId},secondary_player_id.eq.${playerId}`)
    .order("match_elapsed_ms");
  if (error) throw error;
  return data as HockeyEvent[];
}

export async function getPlayerStints(matchId: string): Promise<PlayerStint[]> {
  if (!isSupabaseConfigured()) return demoPlayerStints.filter((s) => s.match_id === matchId);
  const supabase = await createClient();
  const { data, error } = await supabase.from("player_stints").select("*").eq("match_id", matchId);
  if (error) throw error;
  return data as PlayerStint[];
}
