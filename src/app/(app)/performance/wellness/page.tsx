import { getCurrentClub } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { listPlayersForTeam } from "@/modules/athletes/queries";
import { getWellnessForDate } from "@/modules/performance/queries";
import { getActiveTeamId } from "@/lib/team-context";
import { WellnessForm } from "./wellness-form";
import { DateSwitcher } from "./date-switcher";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function WellnessPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const activeDate = date ?? todayIso();

  const club = await getCurrentClub();
  if (!club) return null;
  const teams = await listTeams(club.id);
  const activeTeamId = (await getActiveTeamId()) ?? teams[0]?.id;
  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const roster = activeTeam ? await listPlayersForTeam(activeTeam.id) : [];
  const entriesByPlayer = await getWellnessForDate(roster.map((p) => p.id), activeDate);
  // Map isn't a prop type worth relying on across the server/client boundary — plain object instead.
  const entries = Object.fromEntries(entriesByPlayer);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bien-être</h1>
          <p className="text-sm text-muted-foreground">{activeTeam?.name}</p>
        </div>
        <DateSwitcher date={activeDate} />
      </div>

      <WellnessForm date={activeDate} roster={roster} entries={entries} />
    </div>
  );
}
