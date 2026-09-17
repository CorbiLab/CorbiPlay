import { notFound } from "next/navigation";
import { getPlayer } from "@/modules/athletes/queries";
import { getHockeyEventsForPlayer } from "@/modules/matches/queries";
import { computeMatchStats } from "@/modules/analytics/logic/match-stats";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerPhotoUpload } from "./photo-upload";
import { EditPlayerDialog } from "./edit-player-dialog";
import { DeletePlayerButton } from "./delete-player-button";
import { POSITION_LABEL } from "@/modules/athletes/position-labels";

const MEMBERSHIP_LABEL: Record<string, string> = {
  PERMANENT: "Permanent",
  TEMPORARY: "Temporaire",
  GUEST: "Invité",
  TRAINING_ONLY: "Entraînement",
};

export default async function AthleteProfilePage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const player = await getPlayer(playerId);
  if (!player) notFound();

  const events = await getHockeyEventsForPlayer(playerId);
  const stats = computeMatchStats(events).perPlayer.get(playerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <PlayerPhotoUpload
          playerId={player.id}
          name={player.display_name || player.first_name}
          photoUrl={player.photo_url}
          shirtNumber={player.memberships[0]?.shirt_number ?? null}
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{player.display_name || `${player.first_name} ${player.last_name}`}</h1>
            <EditPlayerDialog
              playerId={player.id}
              firstName={player.first_name}
              lastName={player.last_name}
              displayName={player.display_name}
              birthDate={player.birth_date}
            />
            <DeletePlayerButton playerId={player.id} name={player.display_name || player.first_name} />
          </div>
          <p className="text-sm text-muted-foreground">
            {player.birth_date && `Né le ${new Date(player.birth_date).toLocaleDateString("fr-BE")}`}
          </p>
        </div>
      </div>

      <Card>
        <p className="px-5 font-heading font-semibold">Équipes actuelles</p>
        <CardContent className="px-5 pt-3">
          {/* This is the key Sprint 1 acceptance point (spec §85 items 40-41):
              the athlete belongs to the CLUB, with independent, possibly
              concurrent team memberships — never a single permanent team. */}
          <div className="flex flex-wrap gap-2">
            {player.memberships
              .filter((m) => m.active)
              .map((m) => (
                <Badge key={m.id} variant={m.membership_type === "PERMANENT" ? "default" : "outline"} className="gap-1.5 py-1.5">
                  {m.team.name}
                  {m.positions.length > 0 && (
                    <span className="text-[10px] opacity-70">{m.positions.map((p) => POSITION_LABEL[p] ?? p).join(" / ")}</span>
                  )}
                  <span className="text-[10px] uppercase opacity-70">{MEMBERSHIP_LABEL[m.membership_type] ?? m.membership_type}</span>
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="hockey">
        <TabsList>
          <TabsTrigger value="hockey">Hockey</TabsTrigger>
          <TabsTrigger value="physical">Physique</TabsTrigger>
          <TabsTrigger value="load">Charge</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="hockey">
          <Card>
            <CardContent className="grid grid-cols-2 gap-5 py-6 sm:grid-cols-4">
              <Stat label="Ballons gagnés" value={stats?.ballWins ?? 0} />
              <Stat label="Pertes" value={stats?.turnovers ?? 0} />
              <Stat label="Entrées 25" value={stats?.entries25 ?? 0} />
              <Stat label="Entrées en cercle" value={stats?.circleEntries ?? 0} />
              <Stat label="Tirs" value={stats?.shots ?? 0} />
              <Stat label="Buts" value={stats?.goals ?? 0} />
              <Stat label="Assists" value={stats?.assists ?? 0} />
              <Stat label="PC gagnés" value={stats?.pcWon ?? 0} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="physical">
          <PlaceholderCard title="Performance physique" note="Les métriques GPS arrivent au Sprint 3, une fois l'import STATSports construit." />
        </TabsContent>

        <TabsContent value="load">
          <PlaceholderCard title="Suivi de charge" note="La charge 7/28 jours et la référence match arrivent au Sprint 4." />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="space-y-2 py-2 text-sm">
              {player.memberships.map((m) => (
                <div key={m.id} className="flex justify-between border-b border-border py-2.5 last:border-0">
                  <span>{m.team.name}</span>
                  <span className="text-muted-foreground">
                    {MEMBERSHIP_LABEL[m.membership_type] ?? m.membership_type} · depuis le{" "}
                    {new Date(m.start_date).toLocaleDateString("fr-BE")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-mono text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PlaceholderCard({ title, note }: { title: string; note: string }) {
  return (
    <Card>
      <p className="px-5 font-heading font-semibold">{title}</p>
      <CardContent className="px-5 pt-3">
        <p className="text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
