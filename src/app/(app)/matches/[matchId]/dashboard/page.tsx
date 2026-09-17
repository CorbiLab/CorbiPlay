import { notFound } from "next/navigation";
import { Target, CircleDot, PieChart, ShieldAlert } from "lucide-react";
import { getMatch, getMatchRoster, getHockeyEvents, getPlayerStints, getPossessions } from "@/modules/matches/queries";
import { getTeam } from "@/modules/teams/queries";
import { computeMatchStats, computeOpponentEventCounts } from "@/modules/analytics/logic/match-stats";
import { computePossessions, possessionPercentageBySide } from "@/modules/analytics/logic/possession";
import { computeConversionFunnel } from "@/modules/analytics/logic/sequences";
import { computeMomentum } from "@/modules/analytics/logic/momentum";
import { computeStints, summarizeStints } from "@/modules/matches/logic/stints";
import { formatClock } from "@/modules/matches/logic/clock";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EventCountChart } from "./event-count-chart";
import { ConversionFunnelView } from "./conversion-funnel";
import { MomentumChart } from "./momentum-chart";
import { EventHeatmap } from "./event-heatmap";

export default async function MatchDashboardPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const match = await getMatch(matchId);
  if (!match) notFound();

  const [team, roster, events, storedStints, possessions] = await Promise.all([
    getTeam(match.team_id),
    getMatchRoster(matchId),
    getHockeyEvents(matchId),
    getPlayerStints(matchId),
    getPossessions(matchId),
  ]);

  const stats = computeMatchStats(events);
  const opponentEventCounts = computeOpponentEventCounts(events);
  // Two different "possession" concepts, deliberately not merged (ADR-003):
  // possessionIntervals are derived on the fly from POSSESSION_START/END
  // event pairs, used only for the time-based possession-% stat below;
  // `possessions` (fetched above) are the real materialized rows the same
  // event pairs also now create, used for the conversion funnel, which
  // needs a stable sequence identity to classify and count against.
  const possessionIntervals = computePossessions(events);
  const possessionPct = possessionPercentageBySide(possessionIntervals);
  // team_id is always ours (spec §16) — is_opponent is the only thing that
  // tells "our" possessions/funnel apart from the defensive/opponent one.
  const ourPossessions = possessions.filter((p) => !p.is_opponent);
  const opponentPossessions = possessions.filter((p) => p.is_opponent);
  const funnel = computeConversionFunnel(ourPossessions, events);
  const opponentFunnel = computeConversionFunnel(opponentPossessions, events);

  const matchDurationMs = match.number_of_quarters * match.quarter_duration_minutes * 60_000;
  const momentum = computeMomentum(events, matchDurationMs);
  const starters = roster.filter((r) => r.roster.starter).map((r) => r.player.id);
  const substitutionEvents = events
    .filter((e) => !e.deleted_at && (e.event_type === "PLAYER_IN" || e.event_type === "PLAYER_OUT") && e.player_id)
    .map((e) => ({ playerId: e.player_id!, type: e.event_type as "PLAYER_IN" | "PLAYER_OUT", matchElapsedMs: e.match_elapsed_ms, quarter: e.quarter }));
  const stints = storedStints.length > 0
    ? storedStints.map((s) => ({ playerId: s.player_id, quarter: s.quarter, startMatchElapsedMs: s.start_match_elapsed_ms, endMatchElapsedMs: s.end_match_elapsed_ms }))
    : computeStints(starters, substitutionEvents, matchDurationMs);

  const chartData = Object.entries(stats.countsByType).map(([type, count]) => ({ type, count: count ?? 0 }));
  const opponentChartData = Object.entries(opponentEventCounts).map(([type, count]) => ({ type, count: count ?? 0 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {team?.name} vs {match.opponent_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(match.match_date).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <p className="shrink-0 rounded-xl bg-muted px-4 py-2 font-mono text-3xl font-bold tabular-nums">
          {stats.ourScore}–{match.opponent_score}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile icon={PieChart} label="Possession" value={`${possessionPct.get("us")?.toFixed(0) ?? "—"}%`}>
          {possessionIntervals.length === 0
            ? "Aucune possession taguée."
            : `vs ${possessionPct.get("opponent")?.toFixed(0) ?? "—"}% adverse`}
        </StatTile>
        <StatTile icon={Target} label="Tirs" value={String((stats.countsByType.SHOT ?? 0) + (stats.countsByType.PC_SHOT ?? 0))} />
        <StatTile icon={CircleDot} label="Entrées en cercle" value={String(stats.countsByType.CIRCLE_ENTRY ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="px-5 font-heading font-semibold">Entonnoir de conversion</p>
          <CardContent className="px-5 pt-3">
            <ConversionFunnelView funnel={funnel} />
          </CardContent>
        </Card>

        <Card>
          <p className="px-5 font-heading font-semibold">Momentum</p>
          <CardContent className="px-5 pt-3">
            <MomentumChart points={momentum} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <p className="px-5 font-heading font-semibold">Carte de chaleur</p>
        <CardContent className="px-5 pt-3">
          {events.some((e) => !e.deleted_at && e.start_x != null) ? (
            <EventHeatmap events={events} />
          ) : (
            <p className="text-sm text-muted-foreground">Aucun événement positionné pour l&apos;instant.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <p className="px-5 font-heading font-semibold">Répartition des événements</p>
        <CardContent className="px-5 pt-3">
          {chartData.length > 0 ? <EventCountChart data={chartData} /> : <p className="text-sm text-muted-foreground">Aucun événement enregistré pour l&apos;instant.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="flex items-center gap-1.5 px-5 font-heading font-semibold">
            <ShieldAlert className="size-4 text-category-danger" />
            Entonnoir défensif (adversaire)
          </p>
          <CardContent className="px-5 pt-3">
            <ConversionFunnelView
              funnel={opponentFunnel}
              emptyMessage="Aucune possession adverse matérialisée pour l'instant — tague les événements adverses en direct (bascule « Eux ») pour alimenter cet entonnoir."
              barClassName="bg-category-danger text-white"
            />
          </CardContent>
        </Card>

        <Card>
          <p className="px-5 font-heading font-semibold">Événements adverses</p>
          <CardContent className="px-5 pt-3">
            {opponentChartData.length > 0 ? (
              <EventCountChart data={opponentChartData} fill="var(--category-danger)" />
            ) : (
              <p className="text-sm text-muted-foreground">Aucun événement adverse enregistré pour l&apos;instant.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <p className="px-5 font-heading font-semibold">Statistiques par joueur</p>
        <CardContent className="px-5 pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joueur</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Ballons gagnés</TableHead>
                <TableHead>Pertes</TableHead>
                <TableHead>Entrées 25</TableHead>
                <TableHead>Tirs</TableHead>
                <TableHead>Buts</TableHead>
                <TableHead>Assists</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map(({ player }) => {
                const s = stats.perPlayer.get(player.id);
                const summary = summarizeStints(player.id, stints, matchDurationMs);
                return (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.display_name}</TableCell>
                    <TableCell className="font-mono tabular-nums">{formatClock(summary.timeOnPitchMs)}</TableCell>
                    <TableCell>{s?.ballWins ?? 0}</TableCell>
                    <TableCell>{s?.turnovers ?? 0}</TableCell>
                    <TableCell>{s?.entries25 ?? 0}</TableCell>
                    <TableCell>{s?.shots ?? 0}</TableCell>
                    <TableCell>{s?.goals ?? 0}</TableCell>
                    <TableCell>{s?.assists ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
