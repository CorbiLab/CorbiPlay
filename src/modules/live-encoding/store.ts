import { create } from "zustand";
import { isSupabaseConfigured } from "@/config/app";
import type { EventOutcome, EventParticipant, EventType, HockeyEvent, MatchStatus, Player, Possession } from "@/types/database";
import { getEventDefinition, type EncodingLevel } from "./event-definitions";
import { isReadyToAutoSave, type DraftEvent } from "./logic/event-validation";
import { computeStints, isOnPitch, type ComputedStint, type SubstitutionEvent } from "@/modules/matches/logic/stints";
import {
  endQuarter as endQuarterAnchor,
  getMatchElapsedMs,
  getQuarterElapsedMs,
  pauseQuarter,
  resumeQuarter,
  startQuarter,
  type ClockAnchor,
} from "@/modules/matches/logic/clock";
import { computeMatchStats } from "@/modules/analytics/logic/match-stats";
import { queueWrite, trySync } from "./repository";
import type { SyncStatus } from "./offline/sync";
import { listFailed } from "./offline/outbox";

export interface RosterPlayer {
  player: Player;
  starter: boolean;
  goalkeeper: boolean;
  shirtNumber: number | null;
}

interface LiveEncodingState {
  matchId: string;
  teamId: string;
  quarterDurationMinutes: number;
  numberOfQuarters: number;
  currentQuarter: number;
  status: MatchStatus;
  clockAnchor: ClockAnchor;
  opponentName: string;
  opponentScore: number;

  roster: RosterPlayer[];
  selectedPlayerId: string | null;
  draft: (DraftEvent & { id: string }) | null;

  events: HockeyEvent[];
  eventParticipants: EventParticipant[];
  possessions: Possession[];
  /** Id of the possession currently open (POSSESSION_START tagged, no POSSESSION_END yet) — every event saved while it's set is stamped with this possession_id (ADR-003/HOCKEY_ANALYTICS.md "possession/sequence model"). */
  openPossessionId: string | null;
  /**
   * How much detail the analyst is being asked for right now (ADR-003) — a
   * pure UI/display setting. Switching it never touches roster, events,
   * clock, or the current draft; it only changes what saveDraft stamps on
   * the *next* event and how the live screen presents its inputs.
   */
  encodingLevel: EncodingLevel;
  setEncodingLevel: (level: EncodingLevel) => void;
  /**
   * Who this event/possession is for — team-level only (spec §16: the
   * opponent has no roster, ever). Same UI/display-setting shape as
   * encodingLevel: switching it never touches roster/events/clock/draft,
   * only what saveDraft stamps on the *next* one. An OPPONENT-side draft
   * never carries player_id/participants regardless of what was selected
   * before switching — enforced in saveDraft, not by disabling selection.
   */
  taggingSide: "US" | "OPPONENT";
  setTaggingSide: (side: "US" | "OPPONENT") => void;
  syncStatus: SyncStatus | "DEMO";
  pendingSubSelection: "OUT" | null;
  autoSaveEnabled: boolean;
  toggleAutoSave: () => void;

  // actions
  init: (params: {
    matchId: string;
    teamId: string;
    quarterDurationMinutes: number;
    numberOfQuarters: number;
    currentQuarter: number;
    status: MatchStatus;
    clockAnchor: ClockAnchor;
    opponentName: string;
    opponentScore: number;
    roster: RosterPlayer[];
    events: HockeyEvent[];
    eventParticipants?: EventParticipant[];
    possessions?: Possession[];
  }) => void;

  selectPlayer: (playerId: string) => void;
  clearSelection: () => void;

  beginDraft: (type: EventType) => void;
  setDraftPosition: (x: number, y: number, which: "start" | "end") => void;
  setDraftOutcome: (outcome: EventOutcome) => void;
  setDraftSecondaryPlayer: (playerId: string | null) => void;
  /** Toggles a player in/out of draft.participantIds — only meaningful when the draft event's participantSelectionMode is MULTIPLE (e.g. PRESS). */
  toggleDraftParticipant: (playerId: string) => void;
  setDraftMetadata: (patch: Record<string, unknown>) => void;
  cancelDraft: () => void;
  saveDraft: () => void;

  beginSubstitution: () => void;
  substitute: (outPlayerId: string, inPlayerId: string) => void;

  undoLastEvent: () => void;
  deleteEvent: (eventId: string) => void;
  patchEvent: (eventId: string, patch: Partial<Pick<HockeyEvent, "outcome" | "secondary_player_id" | "player_id" | "enrichment_status">>) => void;
  /** Post-match enrichment for a MULTIPLE-participant event (spec §35) — appends participants to an existing event, never duplicates it. */
  addEventParticipants: (eventId: string, playerIds: string[], roles?: readonly string[]) => void;

  startQuarter: () => void;
  pause: () => void;
  resume: () => void;
  endQuarter: () => void;
  nextQuarter: () => void;
  finishMatch: () => void;

  syncNow: () => Promise<void>;

  // derived getters (computed, not stored)
  getStints: (nowMs?: number) => ComputedStint[];
  getOnFieldIds: () => string[];
  getBenchIds: () => string[];
  getOurScore: () => number;
  getMatchElapsedMs: (nowMs?: number) => number;
  getQuarterElapsedMs: (nowMs?: number) => number;
}

function substitutionEventsFrom(events: HockeyEvent[]): SubstitutionEvent[] {
  return events
    .filter((e) => !e.deleted_at && (e.event_type === "PLAYER_IN" || e.event_type === "PLAYER_OUT") && e.player_id)
    .map((e) => ({ playerId: e.player_id!, type: e.event_type as "PLAYER_IN" | "PLAYER_OUT", matchElapsedMs: e.match_elapsed_ms, quarter: e.quarter }));
}

// A bare UUID, generated client-side, used as-is for the real hockey_events/
// possessions primary key on sync (client-generated-ID offline pattern) —
// no "local-" prefix: hockey_events.id is a Postgres `uuid` column, and a
// prefixed string fails that column's validation outright, which meant
// every INSERT_EVENT permanently failed against a real Supabase project
// (silently retried forever as "OFFLINE" — never actually caught because
// nothing in this session had tested against a real, logged-in backend).
function makeLocalId() {
  return crypto.randomUUID();
}

export const useLiveEncodingStore = create<LiveEncodingState>((set, get) => ({
  matchId: "",
  teamId: "",
  quarterDurationMinutes: 15,
  numberOfQuarters: 4,
  currentQuarter: 0,
  status: "SCHEDULED",
  clockAnchor: { quarterStartedAt: null, quarterPausedAt: null, quarterPausedMsTotal: 0 },
  opponentName: "",
  opponentScore: 0,
  roster: [],
  selectedPlayerId: null,
  draft: null,
  events: [],
  eventParticipants: [],
  possessions: [],
  openPossessionId: null,
  encodingLevel: "STANDARD",
  setEncodingLevel: (level) => set({ encodingLevel: level }),
  taggingSide: "US",
  setTaggingSide: (side) => set({ taggingSide: side }),
  syncStatus: isSupabaseConfigured() ? "SYNCED" : "DEMO",
  pendingSubSelection: null,
  autoSaveEnabled: true,
  toggleAutoSave: () => set((state) => ({ autoSaveEnabled: !state.autoSaveEnabled })),

  init: (params) => {
    const possessions = params.possessions ?? [];
    // Resuming after a refresh mid-possession: whichever row has no end yet is the open one.
    const open = possessions.find((p) => p.end_match_elapsed_ms == null);
    set({ ...params, eventParticipants: params.eventParticipants ?? [], possessions, openPossessionId: open?.id ?? null });
  },

  selectPlayer: (playerId) => {
    const state = get();
    if (state.pendingSubSelection === "OUT") return; // handled by substitute() flow instead
    set({ selectedPlayerId: playerId, draft: state.draft ? { ...state.draft, playerId } : null });
  },

  clearSelection: () => set({ selectedPlayerId: null }),

  beginDraft: (type) => {
    const state = get();
    const def = getEventDefinition(type);
    // An OPPONENT-side draft never carries a player/participants — there is
    // no opponent roster to pick from (spec §16). Enforced here (not just in
    // saveDraft) so the current-event panel never shows a stale "our"
    // player left over from before the side switch.
    const forUs = state.taggingSide === "US";
    set({
      draft: {
        id: makeLocalId(),
        type,
        playerId: forUs && def.participantSelectionMode === "SINGLE" ? state.selectedPlayerId : null,
        participantIds: forUs && def.participantSelectionMode === "MULTIPLE" ? [] : undefined,
      },
    });
  },

  setDraftPosition: (x, y, which) => {
    const state = get();
    if (!state.draft) return;
    const draft = which === "start" ? { ...state.draft, startX: x, startY: y } : { ...state.draft, endX: x, endY: y };
    set({ draft });
    if (state.autoSaveEnabled && isReadyToAutoSave(draft)) get().saveDraft();
  },

  setDraftOutcome: (outcome) => {
    const state = get();
    if (!state.draft) return;
    const draft = { ...state.draft, outcome };
    set({ draft });
    if (state.autoSaveEnabled && isReadyToAutoSave(draft)) get().saveDraft();
  },

  setDraftSecondaryPlayer: (playerId) => {
    const state = get();
    if (!state.draft) return;
    set({ draft: { ...state.draft, secondaryPlayerId: playerId } });
  },

  toggleDraftParticipant: (playerId) => {
    const state = get();
    if (!state.draft) return;
    const current = state.draft.participantIds ?? [];
    const next = current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId];
    set({ draft: { ...state.draft, participantIds: next } });
  },

  setDraftMetadata: (patch) => {
    const state = get();
    if (!state.draft) return;
    set({ draft: { ...state.draft, metadata: { ...state.draft.metadata, ...patch } } });
  },

  cancelDraft: () => set({ draft: null }),

  saveDraft: () => {
    const state = get();
    const draft = state.draft;
    if (!draft) return;
    const def = getEventDefinition(draft.type);
    const now = Date.now();
    const matchElapsedMs = get().getMatchElapsedMs(now);
    const nowIso = new Date(now).toISOString();

    // Possession/sequence materialization (ADR-003/HOCKEY_ANALYTICS.md): a
    // POSSESSION_START opens a real `possessions` row; every event tagged
    // while it's open (including POSSESSION_START/END themselves) is
    // stamped with its id; POSSESSION_END closes it. This is the "live-
    // tagged" mechanism HOCKEY_ANALYTICS.md left undecided — chosen because
    // it needs zero new UI beyond the two event types the schema already
    // reserved for it.
    const isStart = draft.type === "POSSESSION_START";
    const isEnd = draft.type === "POSSESSION_END";
    const possessionId = isStart ? makeLocalId() : state.openPossessionId;
    const forUs = state.taggingSide === "US";

    const event: HockeyEvent = {
      id: makeLocalId(),
      match_id: state.matchId,
      team_id: state.teamId,
      is_opponent: !forUs,
      // Re-enforced here, not just at beginDraft: there's no opponent
      // roster, so an OPPONENT-side event never carries a player/
      // participants regardless of what was selected before the side switch.
      player_id: forUs ? (draft.playerId ?? null) : null,
      secondary_player_id: forUs ? (draft.secondaryPlayerId ?? null) : null,
      possession_id: possessionId,
      quarter: state.currentQuarter,
      absolute_timestamp: new Date(now).toISOString(),
      match_elapsed_ms: matchElapsedMs,
      quarter_elapsed_ms: get().getQuarterElapsedMs(now),
      event_category: def.category,
      event_type: draft.type,
      outcome: draft.outcome ?? null,
      pressure_context: null,
      capture_level: state.encodingLevel,
      enrichment_status: "RAW",
      start_x: draft.startX ?? null,
      start_y: draft.startY ?? null,
      end_x: draft.endX ?? null,
      end_y: draft.endY ?? null,
      metadata: draft.metadata ?? {},
      video_id: null,
      video_timestamp_ms: null,
      deleted_at: null,
      created_by: null,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    };

    // Multi-participant events (PRESS today) get their own event_participants
    // rows alongside the event — see ADR-003. Queued right after INSERT_EVENT
    // so the outbox's in-order drain guarantees the event exists before its
    // participants are inserted, even fully offline.
    const participantIds = forUs ? (draft.participantIds ?? []) : [];
    const participants: EventParticipant[] =
      forUs && def.participantSelectionMode === "MULTIPLE"
        ? participantIds.map((playerId, index) => ({
            id: makeLocalId(),
            event_id: event.id,
            player_id: playerId,
            role: def.participantRoles?.[index] ?? def.participantRoles?.[def.participantRoles.length - 1] ?? "OTHER",
            order_index: index,
            metadata: {},
            created_at: new Date(now).toISOString(),
          }))
        : [];

    let possessions = state.possessions;
    let newPossession: Possession | null = null;
    let closedPossession: Possession | null = null;

    if (isStart && possessionId) {
      newPossession = {
        id: possessionId,
        match_id: state.matchId,
        team_id: state.teamId,
        is_opponent: !forUs,
        quarter: state.currentQuarter,
        start_timestamp: nowIso,
        end_timestamp: null,
        start_match_elapsed_ms: matchElapsedMs,
        end_match_elapsed_ms: null,
        start_x: draft.startX ?? null,
        start_y: draft.startY ?? null,
        end_x: null,
        end_y: null,
        possession_start_type: null,
        attack_type: null,
        tactical_context: null,
        outcome: null,
        metadata: {},
        created_at: nowIso,
        updated_at: nowIso,
      };
      possessions = [...possessions, newPossession];
    } else if (isEnd && state.openPossessionId) {
      const openId = state.openPossessionId;
      possessions = possessions.map((p) =>
        p.id === openId
          ? { ...p, end_match_elapsed_ms: matchElapsedMs, end_x: draft.startX ?? null, end_y: draft.startY ?? null, end_timestamp: nowIso, updated_at: nowIso }
          : p
      );
      closedPossession = possessions.find((p) => p.id === openId) ?? null;
    }

    set({
      events: [...state.events, event],
      eventParticipants: [...state.eventParticipants, ...participants],
      possessions,
      openPossessionId: isStart ? possessionId : isEnd ? null : state.openPossessionId,
      draft: null,
    });

    if (isSupabaseConfigured()) {
      queueWrite("INSERT_EVENT", event)
        .then(() => (participants.length > 0 ? queueWrite("INSERT_EVENT_PARTICIPANTS", participants) : undefined))
        .then(() => (newPossession ? queueWrite("UPSERT_POSSESSION", newPossession) : undefined))
        .then(() => (closedPossession ? queueWrite("UPSERT_POSSESSION", closedPossession) : undefined))
        .then(() => get().syncNow());
    }
  },

  beginSubstitution: () => set({ pendingSubSelection: "OUT" }),

  substitute: (outPlayerId, inPlayerId) => {
    const state = get();
    const now = Date.now();
    const matchElapsedMs = get().getMatchElapsedMs(now);
    const quarterElapsedMs = get().getQuarterElapsedMs(now);

    const makeSubEvent = (playerId: string, type: "PLAYER_IN" | "PLAYER_OUT"): HockeyEvent => ({
      id: makeLocalId(),
      match_id: state.matchId,
      team_id: state.teamId,
      is_opponent: false,
      player_id: playerId,
      secondary_player_id: null,
      possession_id: null,
      quarter: state.currentQuarter,
      absolute_timestamp: new Date(now).toISOString(),
      match_elapsed_ms: matchElapsedMs,
      quarter_elapsed_ms: quarterElapsedMs,
      event_category: "SUBSTITUTION",
      event_type: type,
      outcome: null,
      pressure_context: null,
      capture_level: state.encodingLevel,
      enrichment_status: "RAW",
      start_x: null,
      start_y: null,
      end_x: null,
      end_y: null,
      metadata: {},
      video_id: null,
      video_timestamp_ms: null,
      deleted_at: null,
      created_by: null,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    });

    const outEvent = makeSubEvent(outPlayerId, "PLAYER_OUT");
    const inEvent = makeSubEvent(inPlayerId, "PLAYER_IN");

    // Never silently keep an off-field player selected (spec §20).
    const selectedPlayerId = state.selectedPlayerId === outPlayerId ? inPlayerId : state.selectedPlayerId;

    set({
      events: [...state.events, outEvent, inEvent],
      pendingSubSelection: null,
      selectedPlayerId,
    });

    if (isSupabaseConfigured()) {
      queueWrite("INSERT_EVENT", outEvent)
        .then(() => queueWrite("INSERT_EVENT", inEvent))
        .then(() => get().syncNow());
    }
  },

  undoLastEvent: () => {
    const state = get();
    const live = [...state.events].filter((e) => !e.deleted_at);
    const last = live[live.length - 1];
    if (!last) return;
    get().deleteEvent(last.id);
  },

  deleteEvent: (eventId) => {
    const deletedAt = new Date().toISOString();
    set((state) => ({
      events: state.events.map((e) => (e.id === eventId ? { ...e, deleted_at: deletedAt } : e)),
    }));
    if (isSupabaseConfigured()) {
      queueWrite("DELETE_EVENT", { id: eventId }).then(() => get().syncNow());
    }
  },

  patchEvent: (eventId, patch) => {
    // Assigning a player to a previously-unattributed event is the core
    // post-match enrichment move (spec §27/§35) — bump RAW -> PARTIAL so the
    // event is distinguishable from one nobody has looked at yet, without
    // ever creating a second event row.
    const target = get().events.find((e) => e.id === eventId);
    const fullPatch =
      patch.player_id !== undefined && target?.enrichment_status === "RAW" ? { ...patch, enrichment_status: "PARTIAL" } : patch;

    set((state) => ({
      events: state.events.map((e) => (e.id === eventId ? { ...e, ...fullPatch, updated_at: new Date().toISOString() } : e)),
    }));
    if (isSupabaseConfigured()) {
      queueWrite("UPDATE_EVENT", { id: eventId, patch: fullPatch }).then(() => get().syncNow());
    }
  },

  addEventParticipants: (eventId, playerIds, roles) => {
    const now = new Date().toISOString();
    const state = get();
    const existingCount = state.eventParticipants.filter((p) => p.event_id === eventId).length;
    const newParticipants: EventParticipant[] = playerIds.map((playerId, i) => ({
      id: makeLocalId(),
      event_id: eventId,
      player_id: playerId,
      role: roles?.[i] ?? roles?.[roles.length - 1] ?? "OTHER",
      order_index: existingCount + i,
      metadata: {},
      created_at: now,
    }));

    const target = state.events.find((e) => e.id === eventId);
    set({
      eventParticipants: [...state.eventParticipants, ...newParticipants],
      events:
        target?.enrichment_status === "RAW"
          ? state.events.map((e) => (e.id === eventId ? { ...e, enrichment_status: "PARTIAL", updated_at: now } : e))
          : state.events,
    });

    if (isSupabaseConfigured()) {
      queueWrite("INSERT_EVENT_PARTICIPANTS", newParticipants)
        .then(() =>
          target?.enrichment_status === "RAW"
            ? queueWrite("UPDATE_EVENT", { id: eventId, patch: { enrichment_status: "PARTIAL" } })
            : undefined
        )
        .then(() => get().syncNow());
    }
  },

  startQuarter: () => {
    const state = get();
    const nextQuarterNumber = state.currentQuarter === 0 ? 1 : state.currentQuarter;
    const patch = startQuarter(nextQuarterNumber, Date.now());
    set({ currentQuarter: nextQuarterNumber, clockAnchor: patch, status: "LIVE" });
    if (isSupabaseConfigured()) {
      queueWrite("UPDATE_MATCH_CLOCK", {
        matchId: state.matchId,
        patch: {
          current_quarter: nextQuarterNumber,
          status: "LIVE",
          quarter_started_at: patch.quarterStartedAt,
          quarter_paused_at: patch.quarterPausedAt,
          quarter_paused_ms_total: patch.quarterPausedMsTotal,
        },
      }).then(() => get().syncNow());
    }
  },

  pause: () => {
    const patch = pauseQuarter(get().clockAnchor, Date.now());
    set({ clockAnchor: patch, status: "BREAK" });
  },

  resume: () => {
    const patch = resumeQuarter(get().clockAnchor, Date.now());
    set({ clockAnchor: patch, status: "LIVE" });
  },

  endQuarter: () => {
    const patch = endQuarterAnchor(get().clockAnchor, Date.now());
    set({ clockAnchor: patch, status: "BREAK" });
  },

  nextQuarter: () => {
    const state = get();
    const next = state.currentQuarter + 1;
    const patch = startQuarter(next, Date.now());
    set({ currentQuarter: next, clockAnchor: patch, status: "LIVE" });
    if (isSupabaseConfigured()) {
      queueWrite("UPDATE_MATCH_CLOCK", {
        matchId: state.matchId,
        patch: {
          current_quarter: next,
          status: "LIVE",
          quarter_started_at: patch.quarterStartedAt,
          quarter_paused_at: patch.quarterPausedAt,
          quarter_paused_ms_total: patch.quarterPausedMsTotal,
        },
      }).then(() => get().syncNow());
    }
  },

  finishMatch: () => {
    const state = get();
    const patch = endQuarterAnchor(state.clockAnchor, Date.now());
    set({ clockAnchor: patch, status: "FINISHED" });
    if (isSupabaseConfigured()) {
      queueWrite("UPDATE_MATCH_CLOCK", {
        matchId: state.matchId,
        patch: { status: "FINISHED", our_score: get().getOurScore() },
      }).then(() => get().syncNow());
    }
  },

  syncNow: async () => {
    if (!isSupabaseConfigured()) return;
    set({ syncStatus: "SYNCING" });
    const status = await trySync();
    set({ syncStatus: status });
    // The UI badge can only say "something was lost" (SYNC_LABEL in
    // live-encoding-screen.tsx) — this is where the *what*, for whoever
    // opens the console, since there's no dedicated review UI for this yet.
    if (status === "SYNCED_WITH_ERRORS") {
      const failed = await listFailed();
      console.warn("Ces événements n'ont pas pu être sauvegardés (erreur définitive, ne se réessaiera plus) :", failed);
    }
  },

  getStints: (nowMs) => {
    const state = get();
    const starters = state.roster.filter((r) => r.starter).map((r) => r.player.id);
    const matchEnd = state.status === "FINISHED" ? get().getMatchElapsedMs(nowMs) : undefined;
    return computeStints(starters, substitutionEventsFrom(state.events), matchEnd);
  },

  getOnFieldIds: () => {
    const stints = get().getStints();
    return get()
      .roster.map((r) => r.player.id)
      .filter((id) => isOnPitch(id, stints));
  },

  getBenchIds: () => {
    const onField = new Set(get().getOnFieldIds());
    return get()
      .roster.map((r) => r.player.id)
      .filter((id) => !onField.has(id));
  },

  getOurScore: () => computeMatchStats(get().events).ourScore,

  getMatchElapsedMs: (nowMs) => {
    const state = get();
    return getMatchElapsedMs(state.quarterDurationMinutes, state.currentQuarter || 1, state.clockAnchor, nowMs);
  },

  getQuarterElapsedMs: (nowMs) => getQuarterElapsedMs(get().clockAnchor, nowMs),
}));
