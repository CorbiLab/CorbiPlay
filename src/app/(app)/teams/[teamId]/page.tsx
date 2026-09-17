import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Trophy, Users } from "lucide-react";
import { getTeam } from "@/modules/teams/queries";
import { listPlayersForTeam } from "@/modules/athletes/queries";
import { listMatchesForTeam } from "@/modules/matches/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";

export default async function TeamDashboardPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) notFound();

  const [players, matches] = await Promise.all([listPlayersForTeam(teamId), listMatchesForTeam(teamId)]);
  const nextMatch = matches.filter((m) => m.status === "SCHEDULED").sort((a, b) => (a.match_date > b.match_date ? 1 : -1))[0];
  const lastMatch = matches.find((m) => m.status === "FINISHED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
        <p className="text-sm text-muted-foreground">{players.length} athlètes dans l&apos;effectif actuel.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 px-5">
            <CalendarDays className="size-4 text-primary" />
            <p className="font-heading font-semibold">Prochain match</p>
          </div>
          <CardContent className="px-5 pt-3">
            {nextMatch ? (
              <div className="space-y-3 text-sm">
                <p>
                  vs {nextMatch.opponent_name} — {new Date(nextMatch.match_date).toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}
                </p>
                <Button nativeButton={false} render={<Link href={`/matches/${nextMatch.id}`} />} size="sm">
                  Ouvrir le match
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun match à venir.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="flex items-center gap-2 px-5">
            <Trophy className="size-4 text-primary" />
            <p className="font-heading font-semibold">Dernier match</p>
          </div>
          <CardContent className="px-5 pt-3">
            {lastMatch ? (
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-mono font-semibold tabular-nums">
                    {lastMatch.our_score}–{lastMatch.opponent_score}
                  </span>{" "}
                  vs {lastMatch.opponent_name}
                </p>
                <Button nativeButton={false} render={<Link href={`/matches/${lastMatch.id}/dashboard`} />} size="sm" variant="outline">
                  Voir le tableau de bord
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun match terminé pour l&apos;instant.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 px-5">
          <Users className="size-4 text-primary" />
          <p className="font-heading font-semibold">Effectif</p>
        </div>
        <CardContent className="px-5 pt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {players.map((p) => (
              <Link
                key={p.id}
                href={`/athletes/${p.id}`}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <PlayerAvatar photoUrl={p.photo_url} shirtNumber={p.membership.shirt_number} name={p.display_name || p.first_name} size="xs" />
                <span className="truncate">{p.display_name}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
