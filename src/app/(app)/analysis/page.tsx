import { Trophy, Target, ShieldAlert, Flag } from "lucide-react";
import { getCurrentClub, getActiveSeason } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { listMatchesForTeam, getHockeyEvents } from "@/modules/matches/queries";
import { listPlayersForClub } from "@/modules/athletes/queries";
import { computeSeasonSummary } from "@/modules/analytics/logic/season-summary";
import { getActiveTeamId } from "@/lib/team-context";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { SeasonTrendChart } from "./season-trend-chart";
import type { HockeyEvent } from "@/types/database";

export default async function TeamAnalysisPage() {
  const club = await getCurrentClub();
  if (!club) return null;
  const [teams, season] = await Promise.all([listTeams(club.id), getActiveSeason(club.id)]);
  const activeTeamId = (await getActiveTeamId()) ?? teams[0]?.id;
  const activeTeam = teams.find((t) => t.id === activeTeamId);

  if (!activeTeam || !season) {
    return <p className="text-sm text-muted-foreground">Sélectionne une équipe et assure-toi qu&apos;une saison est active.</p>;
  }

  const allMatches = await listMatchesForTeam(activeTeam.id);
  const seasonMatches = allMatches.filter((m) => m.season_id === season.id);
  const eventsByMatch = new Map<string, HockeyEvent[]>(
    await Promise.all(seasonMatches.map(async (m): Promise<[string, HockeyEvent[]]> => [m.id, await getHockeyEvents(m.id)]))
  );

  const summary = computeSeasonSummary(seasonMatches, eventsByMatch);
  const players = await listPlayersForClub(club.id);
  const playerById = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analyse d&apos;équipe</h1>
        <p className="text-sm text-muted-foreground">
          {activeTeam.name} · {season.name}
        </p>
      </div>

      {summary.played === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucun match terminé cette saison pour l&apos;instant — les statistiques apparaîtront ici au fil des matchs joués.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatTile icon={Trophy} label="Bilan" value={`${summary.wins}V ${summary.draws}N ${summary.losses}D`}>
              {summary.played} match{summary.played > 1 ? "s" : ""} joué{summary.played > 1 ? "s" : ""}
            </StatTile>
            <StatTile icon={Target} label="Buts marqués" value={String(summary.goalsFor)} />
            <StatTile icon={ShieldAlert} label="Buts encaissés" value={String(summary.goalsAgainst)} />
            <StatTile icon={Flag} label="Différence" value={`${summary.goalsFor - summary.goalsAgainst >= 0 ? "+" : ""}${summary.goalsFor - summary.goalsAgainst}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="px-5 font-heading font-semibold">Forme (marge de but par match)</p>
              <CardContent className="px-5 pt-3">
                <SeasonTrendChart matchResults={summary.matchResults} />
              </CardContent>
            </Card>

            <Card>
              <p className="px-5 font-heading font-semibold">Discipline</p>
              <CardContent className="flex items-center gap-6 px-5 pt-3">
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold tabular-nums text-card-green">{summary.cards.green}</p>
                  <p className="text-xs text-muted-foreground">Cartons verts</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold tabular-nums text-card-yellow">{summary.cards.yellow}</p>
                  <p className="text-xs text-muted-foreground">Cartons jaunes</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold tabular-nums text-card-red">{summary.cards.red}</p>
                  <p className="text-xs text-muted-foreground">Cartons rouges</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <p className="px-5 font-heading font-semibold">Meilleurs buteurs</p>
            <CardContent className="px-0 pt-3">
              {summary.perPlayer.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted-foreground">Aucun but attribué à un joueur pour l&apos;instant.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Joueur</TableHead>
                      <TableHead>Buts</TableHead>
                      <TableHead>Assists</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.perPlayer.slice(0, 10).map(({ playerId, goals, assists }) => {
                      const player = playerById.get(playerId);
                      return (
                        <TableRow key={playerId}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <PlayerAvatar photoUrl={player?.photo_url ?? null} shirtNumber={null} name={player?.display_name || player?.first_name || "?"} size="xs" />
                              {player?.display_name ?? "Joueur inconnu"}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono tabular-nums">{goals}</TableCell>
                          <TableCell className="font-mono tabular-nums">{assists}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 px-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-mono text-2xl font-bold tabular-nums">{value}</p>
          {children && <p className="text-xs text-muted-foreground">{children}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
