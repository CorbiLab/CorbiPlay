/**
 * Derives PlayerStint rows from the substitution events in the hockey_events
 * log (spec §21/§59). Stints are stored (not recomputed on every read)
 * because they're relatively expensive to reconstruct, but this function is
 * what (re-)computes them — after every substitution, undo, or edit, per
 * docs/ARCHITECTURE.md "Event sourcing, pragmatically". Pure function: no I/O.
 */

export interface SubstitutionEvent {
  playerId: string;
  type: "PLAYER_IN" | "PLAYER_OUT";
  matchElapsedMs: number;
  quarter: number;
}

export interface ComputedStint {
  playerId: string;
  quarter: number;
  startMatchElapsedMs: number;
  /** null = still on pitch (match/quarter in progress). */
  endMatchElapsedMs: number | null;
}

export interface StintSummary {
  playerId: string;
  timeOnPitchMs: number;
  timeOnBenchMs: number;
  numberOfStints: number;
  averageStintDurationMs: number;
  longestStintMs: number;
}

/**
 * @param starterPlayerIds players who begin the match on the pitch (from
 *   match_rosters where starter = true) — they get an implicit stint from
 *   match_elapsed_ms = 0 with no PLAYER_IN event required.
 * @param events substitution events, any order (sorted internally).
 * @param matchEndElapsedMs elapsed time to close any still-open stint against
 *   (e.g. "now" for a live match, or full match duration once finished).
 *   Leave undefined to leave trailing stints open (endMatchElapsedMs: null).
 */
export function computeStints(
  starterPlayerIds: string[],
  events: SubstitutionEvent[],
  matchEndElapsedMs?: number
): ComputedStint[] {
  const sorted = [...events].sort((a, b) => a.matchElapsedMs - b.matchElapsedMs);

  const open = new Map<string, { start: number; quarter: number }>();
  for (const playerId of starterPlayerIds) {
    open.set(playerId, { start: 0, quarter: 1 });
  }

  const completed: ComputedStint[] = [];

  for (const event of sorted) {
    if (event.type === "PLAYER_OUT") {
      const stint = open.get(event.playerId);
      if (stint) {
        completed.push({
          playerId: event.playerId,
          quarter: stint.quarter,
          startMatchElapsedMs: stint.start,
          endMatchElapsedMs: event.matchElapsedMs,
        });
        open.delete(event.playerId);
      }
    } else {
      if (!open.has(event.playerId)) {
        open.set(event.playerId, { start: event.matchElapsedMs, quarter: event.quarter });
      }
    }
  }

  for (const [playerId, stint] of open.entries()) {
    completed.push({
      playerId,
      quarter: stint.quarter,
      startMatchElapsedMs: stint.start,
      endMatchElapsedMs: matchEndElapsedMs ?? null,
    });
  }

  return completed.sort((a, b) => a.startMatchElapsedMs - b.startMatchElapsedMs);
}

export function summarizeStints(playerId: string, stints: ComputedStint[], matchElapsedMsNow: number): StintSummary {
  const own = stints.filter((s) => s.playerId === playerId);
  const durations = own.map((s) => (s.endMatchElapsedMs ?? matchElapsedMsNow) - s.startMatchElapsedMs);
  const timeOnPitchMs = durations.reduce((sum, d) => sum + d, 0);

  return {
    playerId,
    timeOnPitchMs,
    timeOnBenchMs: Math.max(0, matchElapsedMsNow - timeOnPitchMs),
    numberOfStints: own.length,
    averageStintDurationMs: own.length ? timeOnPitchMs / own.length : 0,
    longestStintMs: durations.length ? Math.max(...durations) : 0,
  };
}

/** Is this player currently on the pitch, given the stints computed so far? */
export function isOnPitch(playerId: string, stints: ComputedStint[]): boolean {
  return stints.some((s) => s.playerId === playerId && s.endMatchElapsedMs === null);
}
