import { notFound } from "next/navigation";
import { getMatch, getMatchRoster, getHockeyEvents, getEventParticipants, getPossessions } from "@/modules/matches/queries";
import { LiveEncodingScreen } from "./live-encoding-screen";

export default async function LiveEncodingPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const match = await getMatch(matchId);
  if (!match) notFound();

  const [roster, events, eventParticipants, possessions] = await Promise.all([
    getMatchRoster(matchId),
    getHockeyEvents(matchId),
    getEventParticipants(matchId),
    getPossessions(matchId),
  ]);

  return (
    <LiveEncodingScreen
      match={match}
      roster={roster}
      initialEvents={events}
      initialEventParticipants={eventParticipants}
      initialPossessions={possessions}
    />
  );
}
