import Link from "next/link";
import { getCurrentClub, getActiveSeason } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { listPlayersForTeam } from "@/modules/athletes/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { NewTeamForm } from "./new-team-form";
import { EditTeamDialog } from "./edit-team-dialog";

export default async function TeamsSettingsPage() {
  const club = await getCurrentClub();
  if (!club) return null;
  const [season, teams] = await Promise.all([getActiveSeason(club.id), listTeams(club.id)]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Équipes</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une équipe</CardTitle>
        </CardHeader>
        <CardContent>
          {season ? <NewTeamForm clubId={club.id} seasonId={season.id} /> : <p className="text-sm text-muted-foreground">Aucune saison active.</p>}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {teams.map((team) => (
          <TeamRow key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}

async function TeamRow({ team }: { team: Awaited<ReturnType<typeof listTeams>>[number] }) {
  const players = await listPlayersForTeam(team.id);

  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{team.name}</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{team.age_category}</Badge>
          <EditTeamDialog teamId={team.id} name={team.name} shortName={team.short_name} ageCategory={team.age_category} gender={team.gender} />
        </div>
      </div>
      {players.length > 0 ? (
        <Link href={`/teams/${team.id}`} className="mt-2 flex flex-wrap items-center gap-1.5">
          {players.map((p) => (
            <PlayerAvatar key={p.id} photoUrl={p.photo_url} shirtNumber={p.membership.shirt_number} name={p.display_name || p.first_name} size="xs" />
          ))}
          <span className="ml-1 text-xs text-muted-foreground">{players.length} joueurs</span>
        </Link>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Aucun joueur pour l&apos;instant.</p>
      )}
    </div>
  );
}
