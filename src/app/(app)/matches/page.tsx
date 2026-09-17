import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { getCurrentClub } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { listMatchesForTeam } from "@/modules/matches/queries";
import { getActiveTeamId } from "@/lib/team-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MATCH_STATUS_LABEL, MATCH_STATUS_VARIANT } from "@/modules/matches/status-labels";

export default async function MatchesPage() {
  const club = await getCurrentClub();
  if (!club) return null;
  const teams = await listTeams(club.id);
  const activeTeamId = (await getActiveTeamId()) ?? teams[0]?.id;
  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const matches = activeTeam ? await listMatchesForTeam(activeTeam.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matchs</h1>
          <p className="text-sm text-muted-foreground">{activeTeam?.name}</p>
        </div>
        <Button nativeButton={false} render={<Link href="/matches/new" />} className="gap-1.5">
          <Plus className="size-4" />
          Nouveau match
        </Button>
      </div>

      <div className="space-y-3">
        {matches.map((match) => (
          <Link key={match.id} href={`/matches/${match.id}`} className="group block">
            <Card className="transition-transform group-hover:-translate-y-0.5">
              <CardContent className="flex items-center justify-between gap-4 px-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <CalendarDays className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {activeTeam?.name} vs {match.opponent_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(match.match_date).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
                      {" · "}
                      {match.competition ?? "Amical"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {match.status === "FINISHED" && (
                    <span className="rounded-md bg-muted px-2 py-1 font-mono text-lg font-semibold tabular-nums">
                      {match.our_score}–{match.opponent_score}
                    </span>
                  )}
                  <Badge variant={MATCH_STATUS_VARIANT[match.status]}>{MATCH_STATUS_LABEL[match.status]}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {matches.length === 0 && (
          <Card>
            <CardContent className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucun match pour l&apos;instant.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
