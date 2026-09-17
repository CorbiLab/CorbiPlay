"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { RosterPicker } from "./roster-picker";
import type { Player, MatchRoster, TeamMembership } from "@/types/database";

type PlayerWithMembership = Player & { membership: TeamMembership };
type RosterEntry = { player: Player; roster: MatchRoster };

interface RosterSectionProps {
  matchId: string;
  players: PlayerWithMembership[];
  roster: RosterEntry[];
}

/**
 * Owns the toggle between "view the current squad" and "re-open the picker
 * to change it" — a match's roster was write-once before this (spec §75 gap:
 * a squad saved with zero starters had no way back in, since the summary
 * card replaced RosterPicker entirely once any roster row existed).
 */
export function RosterSection({ matchId, players, roster }: RosterSectionProps) {
  const hasRoster = roster.length > 0;
  const starters = roster.filter((r) => r.roster.starter);
  const bench = roster.filter((r) => !r.roster.starter);
  const [editing, setEditing] = useState(false);

  if (!hasRoster || editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Composer l&apos;effectif</CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun joueur dans cette équipe pour l&apos;instant — ajoute des joueurs depuis Réglages → Joueurs d&apos;abord.
            </p>
          ) : (
            <RosterPicker
              matchId={matchId}
              players={players}
              existingRoster={roster.map((r) => ({ playerId: r.player.id, starter: r.roster.starter, goalkeeper: r.roster.goalkeeper }))}
              onSaved={() => setEditing(false)}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {/* CardHeader's base class is `grid` (card.tsx) — a `flex-row` override
          only sets flex-direction without display:flex, so this is a plain
          flex div instead (same fix already applied on the team dashboard). */}
      <div className="flex items-center justify-between px-5">
        <CardTitle className="text-base">
          Effectif — {starters.length} sur le terrain / {bench.length} au banc
        </CardTitle>
        <Button variant="ghost" size="icon-sm" aria-label="Modifier l'effectif" onClick={() => setEditing(true)}>
          <Pencil className="size-4" />
        </Button>
      </div>
      <CardContent className="pt-3">
        {starters.length === 0 && (
          <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            Aucun titulaire — personne ne sera sur le terrain pour l&apos;encodage live. Modifie l&apos;effectif et retape
            un joueur du groupe pour le passer titulaire.
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...starters, ...bench].map(({ player, roster: r }) => (
            <div key={player.id} className="flex items-center gap-2 text-sm">
              <PlayerAvatar photoUrl={player.photo_url} shirtNumber={r.shirt_number} name={player.display_name || player.first_name} size="xs" />
              <span className="truncate">{player.display_name}</span>
              {r.goalkeeper && <Badge variant="outline" className="text-[10px]">GB</Badge>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
