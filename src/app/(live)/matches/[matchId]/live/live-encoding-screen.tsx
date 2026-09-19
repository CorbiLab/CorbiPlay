"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveEncodingStore } from "@/modules/live-encoding/store";
import { getEventDefinition } from "@/modules/live-encoding/event-definitions";
import { formatClock } from "@/modules/matches/logic/clock";
import { ZonePitch } from "@/components/pitch/zone-pitch";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronLeft, RotateCcw, Undo2, Users } from "lucide-react";
import type { EncodingLevel } from "@/modules/live-encoding/event-definitions";
import type { Match, HockeyEvent, EventParticipant, Possession } from "@/types/database";
import type { RosterEntry } from "@/modules/matches/queries";
import { RosterPanel } from "./roster-panel";
import { EventGrid } from "./event-grid";
import { CurrentEventPanel } from "./current-event-panel";
import { TimelinePanel } from "./timeline-panel";

interface LiveEncodingScreenProps {
  match: Match;
  roster: RosterEntry[];
  initialEvents: HockeyEvent[];
  initialEventParticipants: EventParticipant[];
  initialPossessions: Possession[];
}

const ENCODING_LEVELS: { value: EncodingLevel; label: string }[] = [
  { value: "BASIC", label: "Basique" },
  { value: "STANDARD", label: "Standard" },
  { value: "ADVANCED", label: "Avancé" },
];

const SYNC_LABEL: Record<string, { text: string; className: string }> = {
  SYNCED: { text: "Synchronisé", className: "bg-category-possession/20 text-category-possession" },
  SYNCING: { text: "Synchronisation…", className: "bg-category-progression/20 text-category-progression" },
  OFFLINE: { text: "Hors ligne — nouvel essai auto", className: "bg-category-danger/20 text-category-danger" },
  // Not "OFFLINE": everything retryable did sync — this is instead the
  // rare permanent-failure case (see isPermanentError, offline/sync.ts) —
  // at least one event could never be saved (its match/possession no
  // longer exists) and never will be, no matter how many times it retries.
  SYNCED_WITH_ERRORS: { text: "Synchronisé — événements perdus, voir console", className: "bg-category-danger/20 text-category-danger" },
  DEMO: { text: "Démo — non enregistré", className: "bg-category-attack/20 text-category-attack" },
};

export function LiveEncodingScreen({ match, roster, initialEvents, initialEventParticipants, initialPossessions }: LiveEncodingScreenProps) {
  const init = useLiveEncodingStore((s) => s.init);
  const [now, setNow] = useState(0);
  const [rosterOverride, setRosterOverride] = useState<{ level: EncodingLevel; visible: boolean } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    init({
      matchId: match.id,
      teamId: match.team_id,
      quarterDurationMinutes: match.quarter_duration_minutes,
      numberOfQuarters: match.number_of_quarters,
      currentQuarter: match.current_quarter,
      status: match.status,
      clockAnchor: {
        quarterStartedAt: match.quarter_started_at,
        quarterPausedAt: match.quarter_paused_at,
        quarterPausedMsTotal: match.quarter_paused_ms_total,
      },
      opponentName: match.opponent_name,
      opponentScore: match.opponent_score,
      roster: roster.map((r) => ({ player: r.player, starter: r.roster.starter, goalkeeper: r.roster.goalkeeper, shirtNumber: r.roster.shirt_number })),
      events: initialEvents,
      eventParticipants: initialEventParticipants,
      possessions: initialPossessions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const status = useLiveEncodingStore((s) => s.status);
  const currentQuarter = useLiveEncodingStore((s) => s.currentQuarter);
  const numberOfQuarters = useLiveEncodingStore((s) => s.numberOfQuarters);
  const clockAnchor = useLiveEncodingStore((s) => s.clockAnchor);
  const opponentName = useLiveEncodingStore((s) => s.opponentName);
  const opponentScore = useLiveEncodingStore((s) => s.opponentScore);
  const ourScore = useLiveEncodingStore((s) => s.getOurScore());
  const syncStatus = useLiveEncodingStore((s) => s.syncStatus);
  const autoSaveEnabled = useLiveEncodingStore((s) => s.autoSaveEnabled);
  const toggleAutoSave = useLiveEncodingStore((s) => s.toggleAutoSave);
  const draft = useLiveEncodingStore((s) => s.draft);
  const openPossessionId = useLiveEncodingStore((s) => s.openPossessionId);
  const setDraftPosition = useLiveEncodingStore((s) => s.setDraftPosition);
  const undoLastEvent = useLiveEncodingStore((s) => s.undoLastEvent);
  const encodingLevel = useLiveEncodingStore((s) => s.encodingLevel);
  const setEncodingLevel = useLiveEncodingStore((s) => s.setEncodingLevel);
  const taggingSide = useLiveEncodingStore((s) => s.taggingSide);
  const setTaggingSide = useLiveEncodingStore((s) => s.setTaggingSide);

  // Switching encoding level never touches roster/events/clock/draft (ADR-003)
  // — only this local display preference. The override is stamped with the
  // level it was set for, so it naturally stops applying (falling back to
  // the level's own default: roster hidden in BASIC, visible otherwise) the
  // moment the level itself changes — derived at render, no effect needed —
  // while still allowing a one-off manual peek within a level (spec §21).
  // OPPONENT tagging collapses the roster the same way BASIC does — there is
  // no opponent roster to pick from, so showing ours would only invite a
  // mis-tap; the override still lets an analyst peek at it if they need to.
  const rosterVisible =
    rosterOverride?.level === encodingLevel ? rosterOverride.visible : encodingLevel !== "BASIC" && taggingSide === "US";

  const startQuarterAction = useLiveEncodingStore((s) => s.startQuarter);
  const pause = useLiveEncodingStore((s) => s.pause);
  const resume = useLiveEncodingStore((s) => s.resume);
  const endQuarter = useLiveEncodingStore((s) => s.endQuarter);
  const resetQuarter = useLiveEncodingStore((s) => s.resetQuarter);
  const nextQuarter = useLiveEncodingStore((s) => s.nextQuarter);
  const finishMatch = useLiveEncodingStore((s) => s.finishMatch);

  const quarterElapsedMs = useLiveEncodingStore((s) => s.getQuarterElapsedMs(now));
  const isRunning = Boolean(clockAnchor.quarterStartedAt && !clockAnchor.quarterPausedAt);
  const hasStarted = Boolean(clockAnchor.quarterStartedAt);
  // "quarter" in the data model covers both formats (spec/DB: number_of_quarters=2
  // for halves) — only the wording changes here, never the underlying field.
  const isHalves = numberOfQuarters === 2;
  const periodAbbrev = isHalves ? "MT" : "Q";
  const periodLabel = isHalves ? "Mi-temps" : "Quart-temps";
  const periodOf = isHalves ? "de la mi-temps" : "du quart-temps";

  function handlePitchTap({ x, y }: { x: number; y: number }) {
    if (!draft) return;
    const def = getEventDefinition(draft.type);
    if (def.endPositionRequired && draft.startX != null && draft.endX == null) {
      setDraftPosition(x, y, "end");
    } else {
      setDraftPosition(x, y, "start");
    }
  }

  const sync = SYNC_LABEL[syncStatus] ?? SYNC_LABEL.DEMO;

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-3">
      {/* HEADER */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-2">
        <Button nativeButton={false} render={<Link href={`/matches/${match.id}`} />} variant="ghost" size="icon">
          <ChevronLeft />
        </Button>
        <div className="font-medium">
          Nous <span className="font-mono text-xl">{ourScore}</span> — <span className="font-mono text-xl">{opponentScore}</span> {opponentName}
        </div>
        <Badge variant="outline">{periodAbbrev}{currentQuarter || "-"} / {numberOfQuarters}</Badge>
        <span className="font-mono text-2xl tabular-nums">{formatClock(quarterElapsedMs)}</span>
        {openPossessionId && (
          <Badge className="bg-category-possession/20 text-category-possession" variant="secondary">
            Possession en cours
          </Badge>
        )}

        <div className="flex items-center gap-2">
          {!hasStarted && status !== "FINISHED" && (
            <Button onClick={startQuarterAction}>Démarrer {periodLabel} {currentQuarter || 1}</Button>
          )}
          {hasStarted && status !== "FINISHED" && (
            <>
              {isRunning ? (
                <Button variant="outline" onClick={pause}>Pause</Button>
              ) : (
                <Button variant="outline" onClick={resume}>Reprendre</Button>
              )}
              <Button variant="outline" size="icon" aria-label="Remettre le chrono à 0" onClick={() => setResetConfirmOpen(true)}>
                <RotateCcw className="size-4" />
              </Button>
              <Button variant="outline" onClick={endQuarter}>Fin {periodOf}</Button>
              {currentQuarter < numberOfQuarters ? (
                <Button onClick={nextQuarter}>{periodLabel} suivant{numberOfQuarters === 2 ? "e" : ""}</Button>
              ) : (
                <Button variant="destructive" onClick={finishMatch}>Terminer le match</Button>
              )}
            </>
          )}
        </div>

        <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remettre le chrono à 0 ?</DialogTitle>
              <DialogDescription>
                Le temps écoulé de {periodAbbrev}{currentQuarter || 1} repart de 00:00 ({isRunning ? "toujours en cours" : "toujours en pause"}).
                Les événements déjà encodés dans ce quart-temps ne sont pas modifiés.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
              <Button
                variant="destructive"
                onClick={() => {
                  resetQuarter();
                  setResetConfirmOpen(false);
                }}
              >
                Remettre à 0
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="ml-auto flex items-center gap-3">
          {/* Who this event/possession is for (spec §16: team-level only, no
              opponent roster) — a real data-quality risk if mis-tapped, so
              this gets its own high-contrast control rather than blending
              into the encoding-level switcher. Sticky like encoding level:
              switching never touches roster/events/clock/draft. */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-muted/50 p-0.5" role="group" aria-label="Pour qui">
            <button
              type="button"
              onClick={() => setTaggingSide("US")}
              aria-pressed={taggingSide === "US"}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
                taggingSide === "US" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              Nous
            </button>
            <button
              type="button"
              onClick={() => setTaggingSide("OPPONENT")}
              aria-pressed={taggingSide === "OPPONENT"}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
                taggingSide === "OPPONENT" ? "bg-category-danger text-white" : "text-muted-foreground hover:bg-accent"
              )}
            >
              Eux
            </button>
          </div>
          {/* Encoding level — always visible, switches instantly, never
              touches roster/events/clock/draft (ADR-003 in ARCHITECTURE.md). */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-muted/50 p-0.5" role="group" aria-label="Niveau d'encodage">
            {ENCODING_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setEncodingLevel(level.value)}
                aria-pressed={encodingLevel === level.value}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                  encodingLevel === level.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                )}
              >
                {level.label}
              </button>
            ))}
          </div>
          {!rosterVisible && (
            <Button variant="outline" size="sm" onClick={() => setRosterOverride({ level: encodingLevel, visible: true })} className="gap-1">
              <Users className="size-4" /> Joueurs
            </Button>
          )}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={autoSaveEnabled} onCheckedChange={toggleAutoSave} /> Sauvegarde auto
          </label>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${sync.className}`}>{sync.text}</span>
          <Button variant="outline" size="sm" onClick={undoLastEvent} className="gap-1">
            <Undo2 className="size-4" /> Annuler
          </Button>
        </div>
      </div>

      {/* MAIN */}
      <div className={cn("grid min-h-0 flex-1 grid-cols-1 gap-3", rosterVisible ? "lg:grid-cols-[220px_1fr_280px]" : "lg:grid-cols-[1fr_280px]")}>
        {rosterVisible && (
          <div className="min-h-0 rounded-md border border-border bg-card p-3">
            <RosterPanel />
          </div>
        )}

        <div className="flex min-h-0 flex-col gap-3">
          {/* All 25 event buttons must be reachable without scrolling
              mid-match — a flat auto-fill grid (EventGrid) keeps this to a
              handful of compact rows, sized for a real touch target (44px+)
              rather than the pitch's leftover space. The cap + scroll here
              is a safety net, not the expected path. */}
          <div className="max-h-[65%] shrink-0 overflow-y-auto rounded-md border border-border bg-card p-3">
            <EventGrid />
          </div>
          {/* Deliberately capped, not "grow to fill whatever's left" — the
              zone-tap targets are already large/coarse (spec §75/§87), so a
              bigger pitch buys little accuracy, while the analyst reads the
              current-draft panel and recent timeline constantly; those get
              the space back instead. */}
          <div className="min-h-[160px] max-h-[38vh] flex-1 rounded-md border border-border bg-card p-2">
            <ZonePitch
              onZoneTap={handlePitchTap}
              interactive={Boolean(draft)}
              markers={
                draft?.startX != null && draft.startY != null
                  ? [{ id: "draft-start", x: draft.startX, y: draft.startY, label: "1" }]
                  : []
              }
            />
          </div>
          {/* Lives here, not as a 4th full-width row below everything: this
              column is the only one whose content is now deliberately
              capped (button grid + pitch), so it's the one with real
              leftover height to give back — putting the timeline here fills
              it with something useful instead of leaving a blank gap next
              to the roster/current-event columns, which still stretch to
              their own full height either side. */}
          <div className="shrink-0 rounded-md border border-border bg-card p-3">
            <TimelinePanel />
          </div>
        </div>

        <div className="min-h-0 rounded-md border border-border bg-card p-3">
          <CurrentEventPanel />
        </div>
      </div>
    </div>
  );
}
