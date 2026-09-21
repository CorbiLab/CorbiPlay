import { computeMatchStats } from "./match-stats";
import type { HockeyEvent, Match } from "@/types/database";

export type MatchResultKind = "WIN" | "DRAW" | "LOSS";

export interface SeasonMatchResult {
  matchId: string;
  matchDate: string;
  opponentName: string;
  ourScore: number;
  opponentScore: number;
  result: MatchResultKind;
}

export interface PlayerSeasonStats {
  playerId: string;
  goals: number;
  assists: number;
}

export interface SeasonSummary {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cards: { green: number; yellow: number; red: number };
  /** Sorted by goals desc, then assists desc — the "top scorers" list. */
  perPlayer: PlayerSeasonStats[];
  /** Chronological (oldest first) — the shape a trend chart reads left-to-right. */
  matchResults: SeasonMatchResult[];
}

/**
 * Cross-match rollup for the season (spec: "Analyse d'équipe" is the
 * season-wide view, distinct from the per-match dashboard at
 * /matches/[matchId]/dashboard). Only FINISHED matches count — a
 * SCHEDULED/LIVE match has no final score and would skew the record.
 *
 * Our own score is always recomputed from events (same reasoning as
 * computeMatchStats: `matches.our_score` is a fast-list cache, not the
 * source of truth), the opponent's score is the plain manual counter
 * (spec §16: no opponent event stream to derive it from).
 */
export function computeSeasonSummary(matches: Match[], eventsByMatch: Map<string, HockeyEvent[]>): SeasonSummary {
  const finished = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => (a.match_date < b.match_date ? -1 : 1));

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  const cards = { green: 0, yellow: 0, red: 0 };
  const perPlayerMap = new Map<string, PlayerSeasonStats>();
  const matchResults: SeasonMatchResult[] = [];

  for (const match of finished) {
    const events = eventsByMatch.get(match.id) ?? [];
    const stats = computeMatchStats(events);
    const ourScore = stats.ourScore;
    const opponentScore = match.opponent_score;

    goalsFor += ourScore;
    goalsAgainst += opponentScore;
    cards.green += stats.countsByType.GREEN_CARD ?? 0;
    cards.yellow += stats.countsByType.YELLOW_CARD ?? 0;
    cards.red += stats.countsByType.RED_CARD ?? 0;

    let result: MatchResultKind;
    if (ourScore > opponentScore) {
      wins += 1;
      result = "WIN";
    } else if (ourScore < opponentScore) {
      losses += 1;
      result = "LOSS";
    } else {
      draws += 1;
      result = "DRAW";
    }
    matchResults.push({ matchId: match.id, matchDate: match.match_date, opponentName: match.opponent_name, ourScore, opponentScore, result });

    for (const [playerId, playerStats] of stats.perPlayer) {
      if (playerStats.goals === 0 && playerStats.assists === 0) continue;
      const entry = perPlayerMap.get(playerId) ?? { playerId, goals: 0, assists: 0 };
      entry.goals += playerStats.goals;
      entry.assists += playerStats.assists;
      perPlayerMap.set(playerId, entry);
    }
  }

  const perPlayer = Array.from(perPlayerMap.values()).sort((a, b) => b.goals - a.goals || b.assists - a.assists);

  return { played: finished.length, wins, draws, losses, goalsFor, goalsAgainst, cards, perPlayer, matchResults };
}
