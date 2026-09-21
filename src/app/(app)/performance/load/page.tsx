import { getCurrentClub } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { listPlayersForTeam } from "@/modules/athletes/queries";
import { listDailyLoadByPlayer } from "@/modules/performance/queries";
import { classifyRisk, computeWorkloadSummary, type RiskZone } from "@/modules/performance/logic/load";
import { getActiveTeamId } from "@/lib/team-context";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/shared/player-avatar";

const RISK_LABEL: Record<RiskZone, string> = {
  NO_DATA: "Pas de données",
  UNDERTRAINED: "Sous-entraîné",
  OPTIMAL: "Optimal",
  CAUTION: "Prudence",
  HIGH_RISK: "Risque élevé",
};

const RISK_VARIANT: Record<RiskZone, "outline" | "secondary" | "default" | "destructive"> = {
  NO_DATA: "outline",
  UNDERTRAINED: "secondary",
  OPTIMAL: "default",
  CAUTION: "secondary",
  HIGH_RISK: "destructive",
};

export default async function SquadLoadPage() {
  const club = await getCurrentClub();
  if (!club) return null;
  const teams = await listTeams(club.id);
  const activeTeamId = (await getActiveTeamId()) ?? teams[0]?.id;
  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const roster = activeTeam ? await listPlayersForTeam(activeTeam.id) : [];
  const loadByPlayer = activeTeam ? await listDailyLoadByPlayer(activeTeam.id) : new Map();

  const rows = roster
    .map((player) => ({ player, summary: computeWorkloadSummary(loadByPlayer.get(player.id) ?? []) }))
    .sort((a, b) => (b.summary.ratio ?? 0) - (a.summary.ratio ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Charge de l&apos;effectif</h1>
        <p className="text-sm text-muted-foreground">
          {activeTeam?.name} · Ratio charge aiguë (7j) / charge chronique (28j) à partir du RPE post-séance.
        </p>
      </div>

      <Card>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucun joueur dans l&apos;effectif actuel de cette équipe pour l&apos;instant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Charge aiguë (7j)</TableHead>
                  <TableHead>Charge chronique (28j)</TableHead>
                  <TableHead>Ratio</TableHead>
                  <TableHead>Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ player, summary }) => {
                  const risk = classifyRisk(summary.ratio);
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar photoUrl={player.photo_url} shirtNumber={null} name={player.display_name || player.first_name} size="xs" />
                          {player.display_name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">{summary.acuteLoad.toFixed(0)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{summary.chronicLoad.toFixed(0)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{summary.ratio != null ? summary.ratio.toFixed(2) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={RISK_VARIANT[risk]}>{RISK_LABEL[risk]}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
