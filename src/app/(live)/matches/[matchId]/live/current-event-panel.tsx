"use client";

import { useState } from "react";
import { useLiveEncodingStore } from "@/modules/live-encoding/store";
import { getEventDefinition, resolvePlayerRequirement } from "@/modules/live-encoding/event-definitions";
import { validateDraftEvent } from "@/modules/live-encoding/logic/event-validation";
import {
  SUGGESTED_ATTACK_TYPES,
  SUGGESTED_POSSESSION_START_TYPES,
  SUGGESTED_PRESS_OUTCOMES,
  SUGGESTED_SEQUENCE_OUTCOMES,
  SUGGESTED_TACTICAL_CONTEXTS,
} from "@/modules/analytics/logic/tactical-vocabulary";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { cn } from "@/lib/utils";
import type { EventOutcome } from "@/types/database";

const PRESS_OUTCOME_LABEL: Record<string, string> = {
  BALL_WIN: "Ball Win",
  FORCED_BACKWARD: "Forced Backward",
  FORCED_LONG_BALL: "Forced Long Ball",
  BROKEN: "Broken",
  NO_EFFECT: "No Effect",
};

// Suggested vocabulary (docs/HOCKEY_ANALYTICS.md "Tactical context & attack
// type") — the columns behind these are plain text, club-configurable, not
// enums (ADR-002); these labels are just the default picker, never enforced.
const POSSESSION_START_TYPE_LABEL: Record<string, string> = {
  BALL_RECOVERY: "Récupération",
  FREE_HIT: "Coup franc",
  SIDELINE_BALL: "Rentrée de touche",
  LONG_CORNER: "Corner long",
  DEFENSIVE_RESTART: "Relance défensive",
  CENTER_PASS: "Engagement",
  OPPONENT_TURNOVER: "Perte adverse",
  INTERCEPTION: "Interception",
  GOALKEEPER_RESTART: "Relance du gardien",
  OTHER: "Autre",
};

const ATTACK_TYPE_LABEL: Record<string, string> = {
  ESTABLISHED_ATTACK: "Attaque établie",
  COUNTER_ATTACK: "Contre-attaque",
  SET_PIECE: "Coup arrêté",
  OTHER: "Autre",
};

const TACTICAL_CONTEXT_LABEL: Record<string, string> = {
  OUTLET: "Sortie de balle",
  TRANSFER: "Transfert",
  BUILD_UP: "Construction",
  HIGH_PRESS: "Press haut",
  THREE_QUARTER_PRESS: "Press 3/4",
  HALF_PRESS: "Press mi-terrain",
  LOW_BLOCK: "Bloc bas",
  COUNTER_PRESS: "Contre-press",
  COUNTER_ATTACK: "Contre-attaque",
  ESTABLISHED_ATTACK: "Attaque établie",
  SET_PIECE: "Coup arrêté",
  OVERLOAD: "Surnombre",
  OTHER: "Autre",
};

const SEQUENCE_OUTCOME_LABEL: Record<string, string> = {
  POSITIVE: "Positif",
  NEUTRAL: "Neutre",
  NEGATIVE: "Négatif",
};

export function CurrentEventPanel() {
  const draft = useLiveEncodingStore((s) => s.draft);
  const roster = useLiveEncodingStore((s) => s.roster);
  const events = useLiveEncodingStore((s) => s.events);
  const saveDraft = useLiveEncodingStore((s) => s.saveDraft);
  const cancelDraft = useLiveEncodingStore((s) => s.cancelDraft);
  const setDraftOutcome = useLiveEncodingStore((s) => s.setDraftOutcome);
  const setDraftMetadata = useLiveEncodingStore((s) => s.setDraftMetadata);
  const patchEvent = useLiveEncodingStore((s) => s.patchEvent);
  const encodingLevel = useLiveEncodingStore((s) => s.encodingLevel);
  const taggingSide = useLiveEncodingStore((s) => s.taggingSide);

  // Smart Goal Workflow (spec §31): after a GOAL saves, offer a non-blocking
  // "Assist?" prompt. Derived from render state (no effect/timer needed) — it
  // shows whenever the most recent tagged event is an assist-less GOAL, and
  // naturally goes away the moment the analyst tags the next event, picks an
  // assist, or dismisses it. `dismissedGoalId` only tracks an explicit Skip.
  const [dismissedGoalId, setDismissedGoalId] = useState<string | null>(null);

  const byId = new Map(roster.map((r) => [r.player.id, r]));
  const liveEvents = events.filter((e) => !e.deleted_at);
  const lastEvent = liveEvents[liveEvents.length - 1];
  const assistCandidate =
    !draft && lastEvent?.event_type === "GOAL" && !lastEvent.secondary_player_id && lastEvent.id !== dismissedGoalId
      ? lastEvent
      : null;

  if (assistCandidate) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Assist ? (optionnel)</p>
        <div className="grid grid-cols-2 gap-2">
          {roster
            .filter((r) => r.player.id !== assistCandidate.player_id)
            .slice(0, 8)
            .map((r) => (
              <Button
                key={r.player.id}
                variant="outline"
                size="sm"
                onClick={() => patchEvent(assistCandidate.id, { secondary_player_id: r.player.id })}
              >
                #{r.shirtNumber} {r.player.display_name}
              </Button>
            ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDismissedGoalId(assistCandidate.id)}>
          Ignorer
        </Button>
      </div>
    );
  }

  if (!draft) {
    return <p className="text-sm text-muted-foreground">Sélectionne un événement pour commencer.</p>;
  }

  const def = getEventDefinition(draft.type);
  const validation = validateDraftEvent(draft);
  const outcomeOptions: EventOutcome[] = ["SUCCESS", "FAIL", "NEUTRAL"];
  const playerRequirement = resolvePlayerRequirement(def, encodingLevel);
  const pressOutcome = draft.metadata?.pressOutcome as string | undefined;
  const possessionStartType = draft.metadata?.possessionStartType as string | undefined;
  const attackType = draft.metadata?.attackType as string | undefined;
  const tacticalContext = draft.metadata?.tacticalContext as string | undefined;
  const sequenceOutcome = draft.metadata?.sequenceOutcome as string | undefined;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Événement</p>
        <p className="text-lg font-semibold">{def.label}</p>
        {taggingSide === "OPPONENT" && (
          <p className="mt-1 inline-block rounded bg-category-danger/15 px-1.5 py-0.5 text-xs font-medium text-category-danger">
            Événement adverse
          </p>
        )}
      </div>

      {/* No opponent roster exists (spec §16) — player/participant selection
          never applies to an opponent-tagged event, regardless of the event
          definition's own selection mode. */}
      {taggingSide === "US" && def.participantSelectionMode === "SINGLE" && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Joueur{playerRequirement === "RECOMMENDED" && " (recommandé)"}
            {playerRequirement === "REQUIRED" && " (obligatoire)"}
          </p>
          <p className="text-sm">
            {draft.playerId ? `#${byId.get(draft.playerId)?.shirtNumber} ${byId.get(draft.playerId)?.player.display_name}` : "Sélectionne un joueur à gauche (optionnel)"}
          </p>
        </div>
      )}

      {taggingSide === "US" && def.participantSelectionMode === "MULTIPLE" && (
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Joueurs impliqués (optionnel)</p>
          {draft.participantIds && draft.participantIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {draft.participantIds.map((id) => (
                <span key={id} className="flex items-center gap-1 rounded-full bg-category-press/15 py-0.5 pr-2 pl-0.5 text-xs">
                  <PlayerAvatar
                    photoUrl={byId.get(id)?.player.photo_url}
                    shirtNumber={byId.get(id)?.shirtNumber ?? null}
                    name={byId.get(id)?.player.display_name ?? ""}
                    size="xs"
                  />
                  {byId.get(id)?.player.display_name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tape les joueurs impliqués à gauche</p>
          )}
        </div>
      )}

      {def.positionRequired && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Position</p>
          <p className="text-sm">{draft.startX != null ? `${draft.startX.toFixed(0)}, ${draft.startY?.toFixed(0)}` : "Touche le terrain"}</p>
        </div>
      )}

      {def.outcomeRequired && (
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Résultat</p>
          <div className="flex gap-2">
            {outcomeOptions.map((outcome) => (
              <Button
                key={outcome}
                size="sm"
                variant={draft.outcome === outcome ? "default" : "outline"}
                onClick={() => setDraftOutcome(outcome)}
              >
                {def.outcomeLabels?.[outcome] ?? outcome}
              </Button>
            ))}
          </div>
        </div>
      )}

      {draft.type === "PRESS" && (
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Résultat de la presse (optionnel)</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PRESS_OUTCOMES.map((outcome) => (
              <Button
                key={outcome}
                size="sm"
                variant={pressOutcome === outcome ? "default" : "outline"}
                onClick={() => setDraftMetadata({ pressOutcome: outcome })}
                className={cn(pressOutcome === outcome && "bg-category-press text-white hover:bg-category-press/90")}
              >
                {PRESS_OUTCOME_LABEL[outcome] ?? outcome}
              </Button>
            ))}
          </div>
        </div>
      )}

      {draft.type === "POSSESSION_START" && (
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Début de possession (optionnel)</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_POSSESSION_START_TYPES.map((type) => (
              <Button
                key={type}
                size="sm"
                variant={possessionStartType === type ? "default" : "outline"}
                onClick={() => setDraftMetadata({ possessionStartType: type })}
                className={cn(possessionStartType === type && "bg-category-possession text-white hover:bg-category-possession/90")}
              >
                {POSSESSION_START_TYPE_LABEL[type] ?? type}
              </Button>
            ))}
          </div>
        </div>
      )}

      {draft.type === "POSSESSION_END" && (
        <>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Type d&apos;attaque (optionnel)</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_ATTACK_TYPES.map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={attackType === type ? "default" : "outline"}
                  onClick={() => setDraftMetadata({ attackType: type })}
                  className={cn(attackType === type && "bg-category-possession text-white hover:bg-category-possession/90")}
                >
                  {ATTACK_TYPE_LABEL[type] ?? type}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Contexte tactique (optionnel)</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TACTICAL_CONTEXTS.map((context) => (
                <Button
                  key={context}
                  size="sm"
                  variant={tacticalContext === context ? "default" : "outline"}
                  onClick={() => setDraftMetadata({ tacticalContext: context })}
                  className={cn(tacticalContext === context && "bg-category-possession text-white hover:bg-category-possession/90")}
                >
                  {TACTICAL_CONTEXT_LABEL[context] ?? context}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Résultat de la séquence (optionnel)</p>
            <div className="flex gap-2">
              {SUGGESTED_SEQUENCE_OUTCOMES.map((outcome) => (
                <Button
                  key={outcome}
                  size="sm"
                  variant={sequenceOutcome === outcome ? "default" : "outline"}
                  onClick={() => setDraftMetadata({ sequenceOutcome: outcome })}
                  className={cn(sequenceOutcome === outcome && "bg-category-possession text-white hover:bg-category-possession/90")}
                >
                  {SEQUENCE_OUTCOME_LABEL[outcome] ?? outcome}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={!validation.valid} onClick={saveDraft}>
          Enregistrer
        </Button>
        <Button variant="ghost" onClick={cancelDraft}>
          Annuler
        </Button>
      </div>
      {!validation.valid && (
        <p className="text-xs text-muted-foreground">Manquant : {validation.missing.join(", ")}</p>
      )}
    </div>
  );
}
