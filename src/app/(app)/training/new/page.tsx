import { getCurrentClub } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { getActiveTeamId } from "@/lib/team-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewTrainingForm } from "./new-training-form";

export default async function NewTrainingPage() {
  const club = await getCurrentClub();
  if (!club) return null;
  const teams = await listTeams(club.id);
  const activeTeamId = (await getActiveTeamId()) ?? teams[0]?.id;

  if (!activeTeamId) {
    return <p className="text-sm text-muted-foreground">Sélectionne une équipe d&apos;abord.</p>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Nouvelle séance</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détails de la séance</CardTitle>
        </CardHeader>
        <CardContent>
          <NewTrainingForm teamId={activeTeamId} />
        </CardContent>
      </Card>
    </div>
  );
}
