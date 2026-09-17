import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getMatch, getMatchRoster, getHockeyEvents, getEventParticipants } from "@/modules/matches/queries";
import { getTeam } from "@/modules/teams/queries";
import { Button } from "@/components/ui/button";
import { EventReviewList } from "./event-review-list";

export default async function MatchReviewPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const match = await getMatch(matchId);
  if (!match) notFound();

  const [team, roster, events, participants] = await Promise.all([
    getTeam(match.team_id),
    getMatchRoster(matchId),
    getHockeyEvents(matchId),
    getEventParticipants(matchId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button nativeButton={false} render={<Link href={`/matches/${match.id}`} />} variant="ghost" size="icon">
          <ChevronLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Réviser {team?.name} vs {match.opponent_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Complète les événements encodés sans joueur — l&apos;événement garde le même identifiant, rien n&apos;est dupliqué.
          </p>
        </div>
      </div>

      <EventReviewList matchId={matchId} events={events} participants={participants} roster={roster} />
    </div>
  );
}
