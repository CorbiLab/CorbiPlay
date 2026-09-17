import "server-only";
import { isSupabaseConfigured } from "@/config/app";
import { createClient } from "@/lib/supabase/server";
import { demoPlayers, demoTeamMemberships, demoTeams } from "@/lib/demo/fixtures";
import type { Player, Team, TeamMembership } from "@/types/database";

export interface PlayerWithMemberships extends Player {
  memberships: (TeamMembership & { team: Pick<Team, "id" | "name" | "short_name"> })[];
}

/** Players currently on a team's roster — spec §8: via team_memberships, never a team_id on Player. */
export async function listPlayersForTeam(teamId: string): Promise<(Player & { membership: TeamMembership })[]> {
  if (!isSupabaseConfigured()) {
    return demoTeamMemberships
      .filter((m) => m.team_id === teamId && m.active)
      .map((m) => {
        const player = demoPlayers.find((p) => p.id === m.player_id)!;
        return { ...player, membership: m };
      })
      .filter((p) => p.active)
      .sort((a, b) => (a.membership.shirt_number ?? 99) - (b.membership.shirt_number ?? 99));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_memberships")
    .select("*, player:players!inner(*)")
    .eq("team_id", teamId)
    .eq("active", true)
    .eq("player.active", true)
    .order("shirt_number");
  if (error) throw error;

  return (data as unknown as (TeamMembership & { player: Player })[]).map(({ player, ...membership }) => ({
    ...player,
    membership,
  }));
}

export async function listPlayersForClub(clubId: string): Promise<Player[]> {
  if (!isSupabaseConfigured()) return demoPlayers.filter((p) => p.club_id === clubId && p.active);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("club_id", clubId)
    .eq("active", true)
    .order("last_name");
  if (error) throw error;
  return data as Player[];
}

export async function getPlayer(playerId: string): Promise<PlayerWithMemberships | null> {
  if (!isSupabaseConfigured()) {
    const player = demoPlayers.find((p) => p.id === playerId);
    if (!player) return null;
    const memberships = demoTeamMemberships
      .filter((m) => m.player_id === playerId)
      .map((m) => ({ ...m, team: demoTeams.find((t) => t.id === m.team_id)! }));
    return { ...player, memberships };
  }

  const supabase = await createClient();
  const { data: player } = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();
  if (!player) return null;

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("*, team:teams(id, name, short_name)")
    .eq("player_id", playerId)
    .order("start_date", { ascending: false });

  return { ...(player as Player), memberships: (memberships as never[]) ?? [] };
}
