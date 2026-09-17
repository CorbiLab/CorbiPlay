import "server-only";
import { isSupabaseConfigured } from "@/config/app";
import { createClient } from "@/lib/supabase/server";
import { demoClub, demoSeason, DEMO_CLUB_ID } from "@/lib/demo/fixtures";
import type { Club, Season } from "@/types/database";

/**
 * Resolves the current user's club. Sprint 1 assumes one club per user
 * (profiles.club_id) — see docs/PERMISSIONS.md. In demo mode there is no
 * auth session at all, so this always returns the fixture club.
 */
export async function getCurrentClub(): Promise<Club | null> {
  if (!isSupabaseConfigured()) return demoClub;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) return null;

  const { data: club } = await supabase.from("clubs").select("*").eq("id", profile.club_id).single();
  return (club as Club) ?? null;
}

export async function getActiveSeason(clubId: string): Promise<Season | null> {
  if (!isSupabaseConfigured()) return clubId === DEMO_CLUB_ID ? demoSeason : null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .eq("club_id", clubId)
    .eq("active", true)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Season) ?? null;
}
