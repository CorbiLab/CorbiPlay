import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatch, getMatchRoster, getHockeyEvents } from "@/modules/matches/queries";
import { getTeam } from "@/modules/teams/queries";
import { listPlayersForTeam } from "@/modules/athletes/queries";
import { MATCH_STATUS_LABEL } from "@/modules/matches/status-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RosterSection } from "./roster-section";
import { VideoSection } from "./video-section";
import { EditMatchDialog } from "./edit-match-dialog";
import { DeleteMatchButton } from "./delete-match-button";

export default async function MatchOverviewPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const match = await getMatch(matchId);
  if (!match) notFound();

  const [team, roster, players, events] = await Promise.all([
    getTeam(match.team_id),
    getMatchRoster(matchId),
    listPlayersForTeam(match.team_id),
    getHockeyEvents(matchId),
  ]);
  const hasEvents = events.some((e) => !e.deleted_at);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">
              {team?.name} vs {match.opponent_name}
            </h1>
            <EditMatchDialog
              matchId={match.id}
              opponentName={match.opponent_name}
              matchDate={match.match_date}
              venue={match.venue}
              competition={match.competition}
              homeOrAway={match.home_or_away}
              status={match.status}
              numberOfQuarters={match.number_of_quarters}
              quarterDurationMinutes={match.quarter_duration_minutes}
            />
            <DeleteMatchButton matchId={match.id} opponentName={match.opponent_name} />
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(match.match_date).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })} · {match.venue} · {match.competition}
          </p>
        </div>
        <Badge>{MATCH_STATUS_LABEL[match.status]}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {match.status !== "FINISHED" && (
          <Button nativeButton={false} render={<Link href={`/matches/${match.id}/live`} />} size="lg">
            Ouvrir l&apos;encodage live
          </Button>
        )}
        <Button nativeButton={false} render={<Link href={`/matches/${match.id}/dashboard`} />} size="lg" variant="outline">
          Tableau de bord du match
        </Button>
        {hasEvents && (
          <Button nativeButton={false} render={<Link href={`/matches/${match.id}/review`} />} size="lg" variant="outline">
            Réviser les événements
          </Button>
        )}
      </div>
      {roster.length === 0 && match.status !== "FINISHED" && (
        <p className="text-sm text-muted-foreground">
          Aucun effectif composé — les événements peuvent quand même être tagués (sans joueur attribué) ; compose
          l&apos;effectif quand tu veux, avant ou après le match, pour attribuer les événements aux joueurs.
        </p>
      )}

      {match.status === "FINISHED" && (
        <p className="rounded-xl bg-muted px-4 py-2 font-mono text-3xl font-bold tabular-nums w-fit">
          {match.our_score}–{match.opponent_score}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <RosterSection matchId={match.id} players={players} roster={roster} />
        <VideoSection
          matchId={match.id}
          videoUrl={match.video_url}
          quarterOffsetsMs={match.video_quarter_offsets_ms}
          numberOfQuarters={match.number_of_quarters}
        />
      </div>
    </div>
  );
}
