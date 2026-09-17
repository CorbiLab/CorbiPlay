import { getCurrentClub, getActiveSeason } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { getActiveTeamId } from "@/lib/team-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewMatchForm } from "./new-match-form";

export default async function NewMatchPage() {
  const club = await getCurrentClub();
  if (!club) return null;
  const [season, teams] = await Promise.all([getActiveSeason(club.id), listTeams(club.id)]);
  const activeTeamId = (await getActiveTeamId()) ?? teams[0]?.id;

  if (!activeTeamId || !season) {
    return <p className="text-sm text-muted-foreground">Sélectionne une équipe et assure-toi qu&apos;une saison est active.</p>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Nouveau match</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détails du match</CardTitle>
        </CardHeader>
        <CardContent>
          <NewMatchForm teams={teams} defaultTeamId={activeTeamId} seasonId={season.id} />
        </CardContent>
      </Card>
    </div>
  );
}
