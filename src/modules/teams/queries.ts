import "server-only";
import { isSupabaseConfigured } from "@/config/app";
import { createClient } from "@/lib/supabase/server";
import { demoTeams } from "@/lib/demo/fixtures";
import type { Team } from "@/types/database";

export async function listTeams(clubId: string): Promise<Team[]> {
  if (!isSupabaseConfigured()) return demoTeams.filter((t) => t.club_id === clubId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("club_id", clubId)
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data as Team[];
}

export async function getTeam(teamId: string): Promise<Team | null> {
  if (!isSupabaseConfigured()) return demoTeams.find((t) => t.id === teamId) ?? null;

  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();
  return (data as Team) ?? null;
}
