import { getCurrentClub, getActiveSeason } from "@/modules/club/queries";
import { listTeams } from "@/modules/teams/queries";
import { getActiveTeamId } from "@/lib/team-context";
import { AppShell } from "@/components/shared/app-shell";
import { signOut } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const club = await getCurrentClub();

  if (!club) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
          HT
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Aucun club lié à ton compte pour l&apos;instant</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Demande à un admin du club de t&apos;ajouter, ou exécute{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">app.bootstrap_admin(&apos;ton@email&apos;)</code>{" "}
          depuis le SQL editor de Supabase si c&apos;est un projet tout neuf.
        </p>
        <form action={signOut}>
          <Button variant="outline" size="sm" type="submit">
            Se déconnecter
          </Button>
        </form>
      </div>
    );
  }

  const [season, teams, cookieTeamId] = await Promise.all([
    getActiveSeason(club.id),
    listTeams(club.id),
    getActiveTeamId(),
  ]);

  const activeTeamId = cookieTeamId && teams.some((t) => t.id === cookieTeamId) ? cookieTeamId : (teams[0]?.id ?? null);

  return (
    <AppShell club={club} season={season} teams={teams} activeTeamId={activeTeamId}>
      {children}
    </AppShell>
  );
}
