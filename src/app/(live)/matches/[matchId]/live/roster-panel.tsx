"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLiveEncodingStore } from "@/modules/live-encoding/store";
import { getEventDefinition } from "@/modules/live-encoding/event-definitions";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, X } from "lucide-react";

export function RosterPanel() {
  const roster = useLiveEncodingStore((s) => s.roster);
  const events = useLiveEncodingStore((s) => s.events);
  const selectedPlayerId = useLiveEncodingStore((s) => s.selectedPlayerId);
  const selectPlayer = useLiveEncodingStore((s) => s.selectPlayer);
  const clearSelection = useLiveEncodingStore((s) => s.clearSelection);
  const beginSubstitution = useLiveEncodingStore((s) => s.beginSubstitution);
  const substitute = useLiveEncodingStore((s) => s.substitute);
  const draft = useLiveEncodingStore((s) => s.draft);
  const toggleDraftParticipant = useLiveEncodingStore((s) => s.toggleDraftParticipant);

  // MULTIPLE-participant events (PRESS today) replace the normal single-
  // select/substitution taps with a toggle into draft.participantIds — see
  // ADR-003. No limit on how many players can be tapped (spec §14).
  const isMultiParticipant = draft ? getEventDefinition(draft.type).participantSelectionMode === "MULTIPLE" : false;
  const participantIds = draft?.participantIds ?? [];

  // getOnFieldIds/getBenchIds build a fresh array on every call, so they must
  // never be read through the zustand selector hook directly (that would
  // make useSyncExternalStore see a "changed" snapshot every render and loop
  // forever) — call them as plain functions, memoized on the actual state
  // slices that affect their result. roster/events aren't referenced
  // textually below (read via getState()) but ARE the real dependencies, so
  // the exhaustive-deps warning here is a false positive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onFieldIds = useMemo(() => useLiveEncodingStore.getState().getOnFieldIds(), [roster, events]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const benchIds = useMemo(() => useLiveEncodingStore.getState().getBenchIds(), [roster, events]);

  const [subMode, setSubMode] = useState(false);
  const [outCandidateId, setOutCandidateId] = useState<string | null>(null);

  const byId = new Map(roster.map((r) => [r.player.id, r]));
  const onField = onFieldIds.map((id) => byId.get(id)!).filter(Boolean);
  const bench = benchIds.map((id) => byId.get(id)!).filter(Boolean);

  function toggleSubMode() {
    if (subMode) {
      setSubMode(false);
      setOutCandidateId(null);
    } else {
      setSubMode(true);
      beginSubstitution();
      // The player already selected (e.g. tapped to log an event) is almost
      // always the one coming off — reuse it as the outgoing candidate so a
      // sub only takes one tap (the incoming player) instead of two.
      setOutCandidateId(selectedPlayerId && onFieldIds.includes(selectedPlayerId) ? selectedPlayerId : null);
    }
  }

  function handleOnFieldTap(playerId: string) {
    if (isMultiParticipant) {
      toggleDraftParticipant(playerId);
      return;
    }
    if (subMode) {
      setOutCandidateId(playerId);
      return;
    }
    selectPlayer(playerId);
  }

  function handleBenchTap(playerId: string) {
    if (isMultiParticipant) {
      toggleDraftParticipant(playerId);
      return;
    }
    if (!subMode) return;
    if (!outCandidateId) {
      toast.warning("Touche d'abord le joueur qui sort du terrain.");
      return;
    }
    substitute(outCandidateId, playerId);
    setSubMode(false);
    setOutCandidateId(null);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joueur en cours</p>
        {selectedPlayerId && (
          <Button variant="ghost" size="sm" onClick={clearSelection} className="h-6 px-2 text-xs">
            <X className="size-3" /> Effacer
          </Button>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2">
        {selectedPlayerId ? (
          <>
            <PlayerAvatar
              photoUrl={byId.get(selectedPlayerId)?.player.photo_url}
              shirtNumber={byId.get(selectedPlayerId)?.shirtNumber ?? null}
              name={byId.get(selectedPlayerId)?.player.display_name ?? ""}
              size="sm"
            />
            <span className="text-lg font-semibold">{byId.get(selectedPlayerId)?.player.display_name}</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Aucun joueur sélectionné</span>
        )}
      </div>

      {isMultiParticipant ? (
        <p className="rounded-md border border-category-press/40 bg-category-press/10 px-3 py-2 text-sm">
          Presse — tape tous les joueurs impliqués ({participantIds.length} sélectionné{participantIds.length > 1 ? "s" : ""})
        </p>
      ) : (
        <Button
          variant={subMode ? "default" : "outline"}
          size="sm"
          onClick={toggleSubMode}
          className="gap-2"
        >
          <ArrowLeftRight className="size-4" />
          {subMode ? (outCandidateId ? "Touche le joueur entrant" : "Touche le joueur sortant") : "Remplacement"}
        </Button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sur le terrain — {onField.length}
        </p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {onField.map((entry) => (
            <PlayerButton
              key={entry.player.id}
              label={entry.player.display_name || entry.player.first_name}
              shirtNumber={entry.shirtNumber}
              photoUrl={entry.player.photo_url}
              selected={entry.player.id === selectedPlayerId}
              highlighted={entry.player.id === outCandidateId}
              multiSelected={participantIds.includes(entry.player.id)}
              onClick={() => handleOnFieldTap(entry.player.id)}
            />
          ))}
        </div>

        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Banc — {bench.length}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {bench.map((entry) => (
            <PlayerButton
              key={entry.player.id}
              label={entry.player.display_name || entry.player.first_name}
              shirtNumber={entry.shirtNumber}
              photoUrl={entry.player.photo_url}
              selected={false}
              dimmed={!subMode && !isMultiParticipant}
              multiSelected={participantIds.includes(entry.player.id)}
              onClick={() => handleBenchTap(entry.player.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerButton({
  label,
  shirtNumber,
  photoUrl,
  selected,
  highlighted,
  dimmed,
  multiSelected,
  onClick,
}: {
  label: string;
  shirtNumber: number | null;
  photoUrl?: string | null;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  multiSelected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-md border px-2 py-2 text-left text-sm transition-colors",
        multiSelected && "border-category-press bg-category-press/20",
        !multiSelected && selected && "border-primary bg-primary/20",
        !multiSelected && highlighted && "border-category-danger bg-category-danger/20",
        !multiSelected && !selected && !highlighted && "border-border hover:bg-accent",
        dimmed && !multiSelected && "opacity-60"
      )}
    >
      <PlayerAvatar photoUrl={photoUrl} shirtNumber={shirtNumber} name={label} size="xs" />
      <span className="truncate">{label}</span>
    </button>
  );
}
