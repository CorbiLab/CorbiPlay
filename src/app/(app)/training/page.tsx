import Link from "next/link";
import { Dumbbell, Plus } from "lucide-react";
import { getCurrentClub } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { listTrainingSessionsForTeam } from "@/modules/training/queries";
import { getActiveTeamId } from "@/lib/team-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TRAINING_SESSION_TYPE_LABEL } from "@/modules/training/status-labels";

export default async function TrainingPage() {
  const club = await getCurrentClub();
  if (!club) return null;
  const teams = await listTeams(club.id);
  const activeTeamId = (await getActiveTeamId()) ?? teams[0]?.id;
  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const sessions = activeTeam ? await listTrainingSessionsForTeam(activeTeam.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entraînements</h1>
          <p className="text-sm text-muted-foreground">{activeTeam?.name}</p>
        </div>
        <Button nativeButton={false} render={<Link href="/training/new" />} className="gap-1.5">
          <Plus className="size-4" />
          Nouvelle séance
        </Button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <Link key={session.id} href={`/training/${session.id}`} className="group block">
            <Card className="transition-transform group-hover:-translate-y-0.5">
              <CardContent className="flex items-center justify-between gap-4 px-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Dumbbell className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{session.title || TRAINING_SESSION_TYPE_LABEL[session.session_type]}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.date).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{TRAINING_SESSION_TYPE_LABEL[session.session_type]}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
        {sessions.length === 0 && (
          <Card>
            <CardContent className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucune séance pour l&apos;instant.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
