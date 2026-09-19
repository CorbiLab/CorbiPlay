"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getEventDefinition } from "@/modules/live-encoding/event-definitions";
import { formatClock } from "@/modules/matches/logic/clock";
import { getVideoTimestampMs, getVideoUrlAt } from "@/modules/matches/logic/video";
import { enrichEventPlayer, enrichEventParticipants } from "@/modules/matches/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { cn } from "@/lib/utils";
import { Pencil, PlayCircle } from "lucide-react";
import type { EventParticipant, HockeyEvent } from "@/types/database";
import type { RosterEntry } from "@/modules/matches/queries";

const ENRICHMENT_LABEL: Record<string, { text: string; variant: "outline" | "secondary" | "default" }> = {
  RAW: { text: "Brut", variant: "outline" },
  PARTIAL: { text: "Partiel", variant: "secondary" },
  ENRICHED: { text: "Enrichi", variant: "default" },
  REVIEWED: { text: "Revu", variant: "default" },
};

interface EventReviewListProps {
  matchId: string;
  events: HockeyEvent[];
  participants: EventParticipant[];
  roster: RosterEntry[];
  videoUrl: string | null;
  videoQuarterOffsetsMs: Record<string, number>;
}

export function EventReviewList({ events, participants, roster, videoUrl, videoQuarterOffsetsMs }: EventReviewListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const byId = new Map(roster.map((r) => [r.player.id, r]));
  const participantsByEvent = new Map<string, EventParticipant[]>();
  for (const p of participants) {
    participantsByEvent.set(p.event_id, [...(participantsByEvent.get(p.event_id) ?? []), p]);
  }

  const live = [...events].filter((e) => !e.deleted_at).sort((a, b) => a.match_elapsed_ms - b.match_elapsed_ms);

  if (live.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun événement encodé pour ce match.</p>;
  }

  return (
    <div className="space-y-2">
      {live.map((event) => {
        const def = getEventDefinition(event.event_type);
        const eventParticipants = participantsByEvent.get(event.id) ?? [];
        const status = ENRICHMENT_LABEL[event.enrichment_status] ?? ENRICHMENT_LABEL.RAW;
        const canEnrich = def.participantSelectionMode !== "NONE";

        return (
          <div key={event.id} className="rounded-lg border border-border">
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="w-12 shrink-0 font-mono text-sm text-muted-foreground">{formatClock(event.match_elapsed_ms)}</span>
              <span className="w-32 shrink-0 truncate text-sm font-medium">{def.label}</span>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-0.5">
                {def.participantSelectionMode === "SINGLE" &&
                  (event.player_id ? (
                    <PlayerChip playerId={event.player_id} byId={byId} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Aucun joueur</span>
                  ))}
                {def.participantSelectionMode === "MULTIPLE" &&
                  (eventParticipants.length > 0 ? (
                    eventParticipants
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((p) => <PlayerChip key={p.id} playerId={p.player_id} byId={byId} />)
                  ) : (
                    <span className="text-xs text-muted-foreground">Aucun joueur</span>
                  ))}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={status.variant}>{status.text}</Badge>

                {videoUrl && (
                  <Button
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Voir dans la vidéo"
                    render={
                      <a
                        href={getVideoUrlAt(videoUrl, getVideoTimestampMs(videoQuarterOffsetsMs, event.quarter, event.quarter_elapsed_ms))}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <PlayCircle className="size-4" />
                  </Button>
                )}

                {canEnrich && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Compléter cet événement"
                    onClick={() => setExpandedId((current) => (current === event.id ? null : event.id))}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {expandedId === event.id && (
              <EnrichPanel
                event={event}
                def={def}
                roster={roster}
                existingParticipantIds={eventParticipants.map((p) => p.player_id)}
                onDone={() => setExpandedId(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlayerChip({ playerId, byId }: { playerId: string; byId: Map<string, RosterEntry> }) {
  const entry = byId.get(playerId);
  if (!entry) return null;
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted py-0.5 pr-2 pl-0.5 text-xs">
      <PlayerAvatar photoUrl={entry.player.photo_url} shirtNumber={entry.roster.shirt_number} name={entry.player.display_name ?? ""} size="xs" />
      {entry.player.display_name}
    </span>
  );
}

function EnrichPanel({
  event,
  def,
  roster,
  existingParticipantIds,
  onDone,
}: {
  event: HockeyEvent;
  def: ReturnType<typeof getEventDefinition>;
  roster: RosterEntry[];
  existingParticipantIds: string[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const sorted = [...roster].sort((a, b) => (a.roster.shirt_number ?? 99) - (b.roster.shirt_number ?? 99));
  const isMultiple = def.participantSelectionMode === "MULTIPLE";
  const selectable = isMultiple ? sorted.filter((r) => !existingParticipantIds.includes(r.player.id)) : sorted;

  function toggle(playerId: string) {
    if (!isMultiple) {
      save([playerId]);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function save(playerIds: string[]) {
    startTransition(async () => {
      const result = isMultiple
        ? await enrichEventParticipants(event.id, playerIds, def.participantRoles ? [...def.participantRoles] : ["OTHER"])
        : await enrichEventPlayer(event.id, playerIds[0]);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Événement complété.");
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="border-t border-border bg-muted/30 p-3">
      <p className="mb-2 text-xs text-muted-foreground">
        {isMultiple ? "Tape les joueurs à ajouter, puis valide." : "Tape le joueur concerné."}
      </p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
        {selectable.map((entry) => (
          <button
            key={entry.player.id}
            type="button"
            onClick={() => toggle(entry.player.id)}
            disabled={pending}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
              selected.has(entry.player.id) ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
            )}
          >
            <PlayerAvatar photoUrl={entry.player.photo_url} shirtNumber={entry.roster.shirt_number} name={entry.player.display_name ?? ""} size="xs" />
            <span className="truncate">{entry.player.display_name}</span>
          </button>
        ))}
      </div>
      {isMultiple && (
        <Button size="sm" className="mt-3" disabled={selected.size === 0 || pending} onClick={() => save([...selected])}>
          {pending ? "Enregistrement..." : `Ajouter ${selected.size || ""}`.trim()}
        </Button>
      )}
    </div>
  );
}
