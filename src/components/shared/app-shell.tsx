import Link from "next/link";
import { isSupabaseConfigured } from "@/config/app";
import { signOut } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { TeamSwitcher } from "./team-switcher";
import type { Club, Season, Team } from "@/types/database";

interface AppShellProps {
  club: Club;
  season: Season | null;
  teams: Team[];
  activeTeamId: string | null;
  children: React.ReactNode;
}

export function AppShell({ club, season, teams, activeTeamId, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-sm shadow-primary/30">
            HT
          </div>
          <span className="truncate font-heading text-[15px] font-semibold tracking-tight">{club.name}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="font-medium text-foreground/70 truncate">{club.short_name || club.name}</span>
            <span className="text-muted-foreground/50">/</span>
            <TeamSwitcher teams={teams} activeTeamId={activeTeamId} />
            {season && (
              <>
                <span className="text-muted-foreground/50">/</span>
                <span className="text-muted-foreground">{season.name}</span>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isSupabaseConfigured() && (
              <span className="rounded-full bg-category-attack/15 px-2.5 py-1 text-xs font-medium text-category-attack">
                Mode démo — non enregistré
              </span>
            )}
            {isSupabaseConfigured() && (
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Se déconnecter
                </Button>
              </form>
            )}
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>

      <Link
        href="/dashboard"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:p-2"
      >
        Aller au tableau de bord
      </Link>
    </div>
  );
}
