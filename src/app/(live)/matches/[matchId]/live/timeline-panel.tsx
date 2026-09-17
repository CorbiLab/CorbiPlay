"use client";

import { useLiveEncodingStore } from "@/modules/live-encoding/store";
import { getEventDefinition } from "@/modules/live-encoding/event-definitions";
import { formatClock } from "@/modules/matches/logic/clock";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function TimelinePanel() {
  const events = useLiveEncodingStore((s) => s.events);
  const roster = useLiveEncodingStore((s) => s.roster);
  const deleteEvent = useLiveEncodingStore((s) => s.deleteEvent);

  const byId = new Map(roster.map((r) => [r.player.id, r]));
  const live = [...events].filter((e) => !e.deleted_at).reverse().slice(0, 12);

  return (
    <div className="flex items-center gap-3 overflow-x-auto">
      {live.length === 0 && <p className="text-sm text-muted-foreground">Aucun événement pour l&apos;instant.</p>}
      {live.map((event) => (
        <div
          key={event.id}
          className="flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs"
        >
          <span className="font-mono text-muted-foreground">{formatClock(event.match_elapsed_ms)}</span>
          <span className="font-medium">{getEventDefinition(event.event_type).label}</span>
          {event.player_id && <span>#{byId.get(event.player_id)?.shirtNumber}</span>}
          {event.outcome && <span className="text-muted-foreground">{event.outcome}</span>}
          <Button
            variant="ghost"
            size="icon"
            className="size-5"
            onClick={() => deleteEvent(event.id)}
            aria-label="Supprimer l'événement"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
