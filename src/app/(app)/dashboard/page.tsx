import Link from "next/link";
import { CalendarDays, ChevronRight, Trophy } from "lucide-react";
import { getCurrentClub } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { listMatchesForTeam } from "@/modules/matches/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function initials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default async function ClubDashboardPage() {
  const club = await getCurrentClub();
  if (!club) return null;
  const teams = await listTeams(club.id);

  const teamsWithNextMatch = await Promise.all(
    teams.map(async (team) => {
      const matches = await listMatchesForTeam(team.id);
      const nextMatch = matches
        .filter((m) => m.status === "SCHEDULED")
        .sort((a, b) => (a.match_date > b.match_date ? 1 : -1))[0];
      const lastFinished = matches.filter((m) => m.status === "FINISHED")[0];
      return { team, nextMatch, lastFinished };
    })
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-md shadow-primary/20">
          {initials(club.short_name || club.name)}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{club.name}</h1>
          <p className="text-sm text-muted-foreground">Vue d&apos;ensemble du club, toutes les équipes.</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {teamsWithNextMatch.map(({ team, nextMatch, lastFinished }) => {
          const won = lastFinished ? lastFinished.our_score > lastFinished.opponent_score : null;
          const drew = lastFinished ? lastFinished.our_score === lastFinished.opponent_score : null;

          return (
            <Link key={team.id} href={`/teams/${team.id}`} className="group">
              <Card className="h-full transition-transform group-hover:-translate-y-0.5">
                <div className="flex items-center gap-3 px-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">
                    {team.short_name?.replace(/\s+Boys|\s+Girls/i, "") || initials(team.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-lg font-semibold leading-tight">{team.name}</p>
                    <Badge variant="outline" className="mt-1 text-[10px] font-medium">
                      {team.age_category} · {team.gender}
                    </Badge>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>

                <CardContent className="space-y-3 px-5 pt-4">
                  <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5">
                    <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
                    {nextMatch ? (
                      <div className="min-w-0 text-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prochain match</p>
                        <p className="truncate font-medium">
                          vs {nextMatch.opponent_name}
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            {new Date(nextMatch.match_date).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun match programmé</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5">
                    <Trophy className="size-4 shrink-0 text-primary" />
                    {lastFinished ? (
                      <div className="flex min-w-0 flex-1 items-center justify-between text-sm">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dernier résultat</p>
                          <p className="truncate font-medium">vs {lastFinished.opponent_name}</p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-2 py-1 font-mono text-sm font-semibold tabular-nums",
                            won && "bg-primary/10 text-primary",
                            drew && "bg-muted text-foreground",
                            won === false && !drew && "bg-destructive/10 text-destructive"
                          )}
                        >
                          {lastFinished.our_score}–{lastFinished.opponent_score}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun match terminé</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
