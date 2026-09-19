/**
 * Match clock engine (spec §22). The clock is anchored on server-persisted
 * timestamps (matches.quarter_started_at / quarter_paused_at /
 * quarter_paused_ms_total), never trusted from a client-only interval, so a
 * page refresh resumes with the correct elapsed time — see
 * docs/ARCHITECTURE.md "Match clock". All functions here are pure: they take
 * the current anchor and a `now` (defaulting to Date.now(), overridable for
 * tests) and return either a derived number or a patch to persist.
 */

export interface ClockAnchor {
  quarterStartedAt: string | null;
  quarterPausedAt: string | null;
  quarterPausedMsTotal: number;
}

export interface ClockAnchorPatch {
  currentQuarter?: number;
  quarterStartedAt: string | null;
  quarterPausedAt: string | null;
  quarterPausedMsTotal: number;
}

export function getQuarterElapsedMs(anchor: ClockAnchor, now: number = Date.now()): number {
  if (!anchor.quarterStartedAt) return 0;
  const started = new Date(anchor.quarterStartedAt).getTime();
  const referenceNow = anchor.quarterPausedAt ? new Date(anchor.quarterPausedAt).getTime() : now;
  return Math.max(0, referenceNow - started - anchor.quarterPausedMsTotal);
}

export function getMatchElapsedMs(
  quarterDurationMinutes: number,
  currentQuarter: number,
  anchor: ClockAnchor,
  now: number = Date.now()
): number {
  const priorQuartersMs = Math.max(0, currentQuarter - 1) * quarterDurationMinutes * 60_000;
  return priorQuartersMs + getQuarterElapsedMs(anchor, now);
}

export function isPaused(anchor: ClockAnchor): boolean {
  return Boolean(anchor.quarterStartedAt && anchor.quarterPausedAt);
}

export function isRunning(anchor: ClockAnchor): boolean {
  return Boolean(anchor.quarterStartedAt && !anchor.quarterPausedAt);
}

export function startQuarter(quarterNumber: number, now: number = Date.now()): ClockAnchorPatch {
  return {
    currentQuarter: quarterNumber,
    quarterStartedAt: new Date(now).toISOString(),
    quarterPausedAt: null,
    quarterPausedMsTotal: 0,
  };
}

export function pauseQuarter(anchor: ClockAnchor, now: number = Date.now()): ClockAnchorPatch {
  if (!isRunning(anchor)) {
    return { quarterStartedAt: anchor.quarterStartedAt, quarterPausedAt: anchor.quarterPausedAt, quarterPausedMsTotal: anchor.quarterPausedMsTotal };
  }
  return {
    quarterStartedAt: anchor.quarterStartedAt,
    quarterPausedAt: new Date(now).toISOString(),
    quarterPausedMsTotal: anchor.quarterPausedMsTotal,
  };
}

export function resumeQuarter(anchor: ClockAnchor, now: number = Date.now()): ClockAnchorPatch {
  if (!isPaused(anchor)) {
    return { quarterStartedAt: anchor.quarterStartedAt, quarterPausedAt: anchor.quarterPausedAt, quarterPausedMsTotal: anchor.quarterPausedMsTotal };
  }
  const pausedDuration = now - new Date(anchor.quarterPausedAt!).getTime();
  return {
    quarterStartedAt: anchor.quarterStartedAt,
    quarterPausedAt: null,
    quarterPausedMsTotal: anchor.quarterPausedMsTotal + Math.max(0, pausedDuration),
  };
}

/** Freezes the clock at its current elapsed time (used by END QUARTER). */
export function endQuarter(anchor: ClockAnchor, now: number = Date.now()): ClockAnchorPatch {
  return isPaused(anchor) ? { ...anchor } : pauseQuarter(anchor, now);
}

export function formatClock(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Inverse of formatClock — "12:34" -> 754000. Null for anything not `mm:ss`/`h:mm:ss` (e.g. empty, garbled input). */
export function parseClock(text: string): number | null {
  const parts = text.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => p === "" || Number.isNaN(Number(p)))) return null;
  const numbers = parts.map(Number);
  const seconds = numbers.pop()!;
  const minutes = numbers.pop()!;
  const hours = numbers.pop() ?? 0;
  if (seconds < 0 || seconds >= 60 || minutes < 0 || minutes >= 60 || hours < 0) return null;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}
