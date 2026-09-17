"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ACTIVE_TEAM_COOKIE = "active_team_id";

/**
 * The active team is carried by the URL/a cookie, not global server state
 * (see docs/ARCHITECTURE.md "Multi-tenancy / team context") — this lets
 * every Server Component read "which team is the analyst looking at" without
 * a client round-trip, while <TeamSwitcher /> just navigates.
 */
export async function getActiveTeamId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_TEAM_COOKIE)?.value ?? null;
}

export async function setActiveTeam(teamId: string, redirectTo?: string) {
  const store = await cookies();
  store.set(ACTIVE_TEAM_COOKIE, teamId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  if (redirectTo) redirect(redirectTo);
}
