import Link from "next/link";
import { UserPlus } from "lucide-react";
import { getCurrentClub } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { listPlayersForTeam } from "@/modules/athletes/queries";
import { getActiveTeamId } from "@/lib/team-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { POSITION_LABEL } from "@/modules/athletes/position-labels";

const MEMBERSHIP_LABEL: Record<string, string> = {
  TEMPORARY: "Temporaire",
  GUEST: "Invité",
  TRAINING_ONLY: "Entraînement",
};

export default async function SquadPage() {
  const club = await getCurrentClub();
  if (!club) return null;
  const teams = await listTeams(club.id);
  const activeTeamId = (await getActiveTeamId()) ?? teams[0]?.id;
  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const players = activeTeam ? await listPlayersForTeam(activeTeam.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Effectif</h1>
          <p className="text-sm text-muted-foreground">
            {activeTeam ? activeTeam.name : "Sélectionne une équipe"} — {players.length} athlètes
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/settings/players" />} variant="outline" className="gap-1.5">
          <UserPlus className="size-4" />
          Ajouter un joueur
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {players.map((p) => (
          <Link key={p.id} href={`/athletes/${p.id}`} className="group">
            <Card className="h-full transition-transform group-hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-3 px-4">
                <PlayerAvatar photoUrl={p.photo_url} shirtNumber={p.membership.shirt_number} name={p.display_name || p.first_name} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.display_name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {p.membership.positions.map((pos) => (
                      <Badge key={pos} variant="secondary" className="text-[10px]">
                        {POSITION_LABEL[pos] ?? pos}
                      </Badge>
                    ))}
                    {p.membership.membership_type !== "PERMANENT" && (
                      <Badge variant="outline" className="text-[10px]">
                        {MEMBERSHIP_LABEL[p.membership.membership_type] ?? p.membership.membership_type}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
