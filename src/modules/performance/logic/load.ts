/**
 * Acute:Chronic Workload Ratio (ACWR) over Session-RPE load (Sprint 4), same
 * "typed constant, no DB-editable config yet" posture as momentum.ts and the
 * match-reference formula — see ROADMAP.md issue #2. Not a novel formula:
 * Gabbett's rolling-average ACWR (7-day acute window / 28-day chronic
 * window), the most common version used in team-sport load monitoring.
 */

export interface DailyLoadEntry {
  /** ISO date (YYYY-MM-DD) — the sporting_session's date, not the RPE entry's created_at. */
  date: string;
  sessionLoad: number;
}

export interface WorkloadSummary {
  /** Average daily load over the trailing 7 days (today inclusive), a rest day counting as 0 — not an average of only the days trained. */
  acuteLoad: number;
  /** Same, over the trailing 28 days. */
  chronicLoad: number;
  /** acuteLoad / chronicLoad — null before there's any chronic history to divide by (chronicLoad === 0), not Infinity/NaN. */
  ratio: number | null;
}

/** Sums every entry's sessionLoad landing on the same calendar date — a two-a-day genuinely adds up, not overwrites. */
function sumByDate(entries: DailyLoadEntry[]): Map<string, number> {
  const byDate = new Map<string, number>();
  for (const entry of entries) {
    byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.sessionLoad);
  }
  return byDate;
}

function averageOverWindow(byDate: Map<string, number>, asOf: Date, windowDays: number): number {
  let total = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(asOf);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    total += byDate.get(key) ?? 0;
  }
  return total / windowDays;
}

export function computeWorkloadSummary(entries: DailyLoadEntry[], asOf: Date = new Date()): WorkloadSummary {
  const byDate = sumByDate(entries);
  const acuteLoad = averageOverWindow(byDate, asOf, 7);
  const chronicLoad = averageOverWindow(byDate, asOf, 28);
  return { acuteLoad, chronicLoad, ratio: chronicLoad > 0 ? acuteLoad / chronicLoad : null };
}

export type RiskZone = "UNDERTRAINED" | "OPTIMAL" | "CAUTION" | "HIGH_RISK" | "NO_DATA";

/**
 * Conventional ACWR bands (Gabbett/Hulin): <0.8 underprepared for a rise in
 * load, 0.8-1.3 "sweet spot", 1.3-1.5 caution, >1.5 associated with a
 * measurably higher injury rate. NO_DATA (not just a wide OPTIMAL band) when
 * there's no chronic load yet — a brand-new player shouldn't read as
 * "optimal" from an absence of data.
 */
export function classifyRisk(ratio: number | null): RiskZone {
  if (ratio === null) return "NO_DATA";
  if (ratio < 0.8) return "UNDERTRAINED";
  if (ratio <= 1.3) return "OPTIMAL";
  if (ratio <= 1.5) return "CAUTION";
  return "HIGH_RISK";
}
