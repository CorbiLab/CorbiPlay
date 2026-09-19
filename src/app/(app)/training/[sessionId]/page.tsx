import { notFound } from "next/navigation";
import { getTrainingSession, getTrainingAttendance } from "@/modules/training/queries";
import { getTeam } from "@/modules/teams/queries";
import { TRAINING_SESSION_TYPE_LABEL } from "@/modules/training/status-labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditTrainingDialog } from "./edit-training-dialog";
import { DeleteTrainingButton } from "./delete-training-button";
import { AttendanceSection } from "./attendance-section";

export default async function TrainingSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getTrainingSession(sessionId);
  if (!session) notFound();

  const [team, attendance] = await Promise.all([getTeam(session.team_id), getTrainingAttendance(sessionId)]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{session.title || TRAINING_SESSION_TYPE_LABEL[session.session_type]}</h1>
            <EditTrainingDialog
              sessionId={session.id}
              date={session.date}
              sessionType={session.session_type}
              title={session.title}
              description={session.description}
              plannedLoad={session.planned_load}
            />
            <DeleteTrainingButton sessionId={session.id} title={session.title || TRAINING_SESSION_TYPE_LABEL[session.session_type]} />
          </div>
          <p className="text-sm text-muted-foreground">
            {team?.name} ·{" "}
            {new Date(session.date).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Badge variant="outline">{TRAINING_SESSION_TYPE_LABEL[session.session_type]}</Badge>
      </div>

      {session.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contenu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{session.description}</p>
          </CardContent>
        </Card>
      )}

      <AttendanceSection sessionId={session.id} attendance={attendance} />
    </div>
  );
}
