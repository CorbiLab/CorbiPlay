import Link from "next/link";
import { getCurrentClub } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { listPlayersForClub } from "@/modules/athletes/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewPlayerForm } from "./new-player-form";

export default async function PlayersSettingsPage() {
  const club = await getCurrentClub();
  if (!club) return null;
  const [teams, players] = await Promise.all([listTeams(club.id), listPlayersForClub(club.id)]);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Joueurs</h1>
      <p className="text-sm text-muted-foreground">
        Les joueurs appartiennent au club, pas de façon permanente à une équipe — leur assigner une équipe ici crée
        une <span className="font-medium">appartenance d&apos;équipe</span>, qui peut ensuite être modifiée ou
        complétée sans perdre l&apos;historique de l&apos;athlète.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un joueur</CardTitle>
        </CardHeader>
        <CardContent>
          <NewPlayerForm clubId={club.id} teams={teams} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((p) => (
          <Link key={p.id} href={`/athletes/${p.id}`} className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-accent">
            {p.first_name} {p.last_name}
          </Link>
        ))}
      </div>
    </div>
  );
}
