"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { cn } from "@/lib/utils";
import { setMatchRoster } from "@/modules/matches/actions";
import { MATCH_ROSTER_SIZE, ON_FIELD_SIZE } from "@/config/app";
import type { Player, TeamMembership } from "@/types/database";

type PlayerWithMembership = Player & { membership: TeamMembership };

export interface ExistingRosterEntry {
  playerId: string;
  starter: boolean;
  goalkeeper: boolean;
}

interface RosterPickerProps {
  matchId: string;
  players: PlayerWithMembership[];
  /** Pre-fills the picker when re-opening it for a match that already has a roster (see EditRosterButton). */
  existingRoster?: ExistingRosterEntry[];
  onSaved?: () => void;
}

/**
 * Composing a match squad, all by tap — no dropdown, no checkbox list (spec
 * §18/§75: large touch-friendly buttons only). Tap cycles a player through
 * OFF → BENCH → STARTER → OFF; a small keeper badge on starters marks the
 * single goalkeeper. This is what was missing for any match created through
 * the app itself — the demo matches only worked because their roster was
 * pre-seeded directly in the database.
 */
export function RosterPicker({ matchId, players, existingRoster, onSaved }: RosterPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(existingRoster?.map((r) => r.playerId)));
  const [starters, setStarters] = useState<Set<string>>(new Set(existingRoster?.filter((r) => r.starter).map((r) => r.playerId)));
  const [goalkeeperId, setGoalkeeperId] = useState<string | null>(existingRoster?.find((r) => r.goalkeeper)?.playerId ?? null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const sorted = [...players].sort((a, b) => (a.membership.shirt_number ?? 99) - (b.membership.shirt_number ?? 99));

  function cyclePlayer(playerId: string) {
    if (starters.has(playerId)) {
      setStarters((prev) => {
        const next = new Set(prev);
        next.delete(playerId);
        return next;
      });
      if (goalkeeperId === playerId) setGoalkeeperId(null);
      return;
    }
    if (selected.has(playerId)) {
      if (starters.size >= ON_FIELD_SIZE) {
        toast.warning(`${ON_FIELD_SIZE} titulaires maximum — retire-en un d'abord.`);
        return;
      }
      setStarters((prev) => new Set(prev).add(playerId));
      return;
    }
    if (selected.size >= MATCH_ROSTER_SIZE) {
      toast.warning(`${MATCH_ROSTER_SIZE} joueurs maximum dans le groupe.`);
      return;
    }
    setSelected((prev) => new Set(prev).add(playerId));
  }

  function toggleGoalkeeper(playerId: string) {
    if (!starters.has(playerId)) return;
    setGoalkeeperId((current) => (current === playerId ? null : playerId));
  }

  function handleSave() {
    if (selected.size === 0) {
      toast.error("Sélectionne au moins un joueur.");
      return;
    }
    if (starters.size === 0) {
      toast.error("Retape au moins un joueur du groupe pour le passer titulaire — sans ça, personne n'est sur le terrain.");
      return;
    }
    startTransition(async () => {
      await setMatchRoster({
        matchId,
        playerIds: [...selected],
        starterIds: [...starters],
        goalkeeperId: goalkeeperId ?? undefined,
      });
      toast.success("Effectif enregistré.");
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Tape un joueur pour l&apos;ajouter au groupe, retape pour le passer titulaire.
        </p>
        <div className="flex items-center gap-3 text-sm font-medium">
          <span className={cn(selected.size === MATCH_ROSTER_SIZE && "text-primary")}>
            {selected.size}/{MATCH_ROSTER_SIZE} joueurs
          </span>
          <span className={cn(starters.size === ON_FIELD_SIZE && "text-primary")}>
            {starters.size}/{ON_FIELD_SIZE} titulaires
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {sorted.map((player) => {
          const isStarter = starters.has(player.id);
          const isSelected = selected.has(player.id);
          const isKeeper = goalkeeperId === player.id;

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => cyclePlayer(player.id)}
              className={cn(
                "relative flex min-h-14 items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
                isStarter && "border-primary bg-primary/10",
                isSelected && !isStarter && "border-primary/40 bg-primary/5",
                !isSelected && "border-border hover:bg-accent"
              )}
            >
              <PlayerAvatar
                photoUrl={player.photo_url}
                shirtNumber={player.membership.shirt_number}
                name={player.display_name || player.first_name}
                size="sm"
                className={isSelected ? "bg-primary text-primary-foreground" : undefined}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{player.display_name || player.first_name}</span>
                <span className={cn("block text-[10px] uppercase tracking-wide text-muted-foreground", isStarter && "pr-5")}>
                  {isStarter ? "Titulaire" : isSelected ? "Banc" : "—"}
                </span>
              </span>
              {isSelected && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-2.5" />
                </span>
              )}
              {isStarter && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Marquer comme gardien"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGoalkeeper(player.id);
                  }}
                  className={cn(
                    "absolute bottom-1.5 right-1.5 flex size-5 items-center justify-center rounded-full border transition-colors",
                    isKeeper ? "border-category-attack bg-category-attack text-white" : "border-border bg-background text-muted-foreground"
                  )}
                >
                  <Shield className="size-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={pending} size="lg">
        {pending ? "Enregistrement..." : "Enregistrer l'effectif"}
      </Button>
    </div>
  );
}
