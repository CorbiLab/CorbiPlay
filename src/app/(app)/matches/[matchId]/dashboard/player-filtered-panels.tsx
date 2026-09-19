"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventHeatmap } from "./event-heatmap";
import { EventCountChart } from "./event-count-chart";
import { computeMatchStats } from "@/modules/analytics/logic/match-stats";
import type { HockeyEvent } from "@/types/database";
import type { RosterEntry } from "@/modules/matches/queries";

const ALL_PLAYERS = "ALL";

/**
 * "Carte de chaleur" + "Répartition des événements" filtered to one player
 * at a time, or every player (the previous, unfiltered behaviour) — both
 * pure functions underneath already take a plain event array, so filtering
 * is just narrowing that array client-side before the same computation the
 * unfiltered dashboard already ran server-side. Not extended to the
 * conversion funnel or momentum: a possession/momentum swing isn't really
 * "one player's", the way a tagged event's position or type is.
 */
export function PlayerFilteredPanels({ events, roster }: { events: HockeyEvent[]; roster: RosterEntry[] }) {
  const [playerId, setPlayerId] = useState<string>(ALL_PLAYERS);

  const filteredEvents = useMemo(
    () => (playerId === ALL_PLAYERS ? events : events.filter((e) => e.player_id === playerId)),
    [events, playerId]
  );
  const chartData = useMemo(() => {
    const counts = computeMatchStats(filteredEvents).countsByType;
    return Object.entries(counts).map(([type, count]) => ({ type, count: count ?? 0 }));
  }, [filteredEvents]);

  const byId = new Map(roster.map((r) => [r.player.id, r]));
  const playerLabel = playerId === ALL_PLAYERS ? "Tous les joueurs" : (byId.get(playerId)?.player.display_name ?? "Joueur");

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">Filtrer par joueur</p>
        <Select value={playerId} onValueChange={(value) => setPlayerId(value ?? ALL_PLAYERS)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue>{() => playerLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PLAYERS}>Tous les joueurs</SelectItem>
            {roster.map((r) => (
              <SelectItem key={r.player.id} value={r.player.id}>
                {r.player.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <p className="px-5 font-heading font-semibold">Carte de chaleur</p>
        <CardContent className="px-5 pt-3">
          {filteredEvents.some((e) => !e.deleted_at && e.start_x != null) ? (
            <EventHeatmap events={filteredEvents} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {playerId === ALL_PLAYERS
                ? "Aucun événement positionné pour l'instant."
                : "Aucun événement positionné pour ce joueur."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <p className="px-5 font-heading font-semibold">Répartition des événements</p>
        <CardContent className="px-5 pt-3">
          {chartData.length > 0 ? (
            <EventCountChart data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {playerId === ALL_PLAYERS ? "Aucun événement enregistré pour l'instant." : "Aucun événement pour ce joueur."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
