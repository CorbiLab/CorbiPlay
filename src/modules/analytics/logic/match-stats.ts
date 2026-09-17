import type { EventType, HockeyEvent } from "@/types/database";

/**
 * All match statistics are computed from hockey_events on read (spec §33/§72)
 * — nothing here is a hand-maintained counter, so editing/deleting/undoing an
 * event just means re-running this function; there is nothing else to "fix up".
 *
 * Note on score (see docs/ROADMAP.md issue list): `matches.our_score` exists
 * as a fast-list-view cache, but the source of truth for OUR score is always
 * a count of our own GOAL/PC_GOAL events here. The opponent's score is NOT
 * derivable from events — per spec §16 the opponent has no managed roster or
 * event stream, so `matches.opponent_score` is a plain manually-incremented
 * counter, tracked separately from this computation.
 *
 * `computeMatchStats` only ever counts `!is_opponent` events, now that
 * opponent-side events can exist in the same table (is_opponent, shipped
 * alongside opponent event tagging) — see `computeOpponentEventCounts`
 * below for the mirror view.
 */

export interface PlayerMatchStats {
  playerId: string;
  ballWins: number;
  turnovers: number;
  entries25: number;
  circleEntries: number;
  shots: number;
  chances: number;
  goals: number;
  assists: number;
  pcWon: number;
  interceptions: number;
  tackles: number;
}

export interface MatchStats {
  ourScore: number;
  countsByType: Partial<Record<EventType, number>>;
  perPlayer: Map<string, PlayerMatchStats>;
}

const SCORING_TYPES: EventType[] = ["GOAL", "PC_GOAL"];

function emptyPlayerStats(playerId: string): PlayerMatchStats {
  return {
    playerId,
    ballWins: 0,
    turnovers: 0,
    entries25: 0,
    circleEntries: 0,
    shots: 0,
    chances: 0,
    goals: 0,
    assists: 0,
    pcWon: 0,
    interceptions: 0,
    tackles: 0,
  };
}

export function computeMatchStats(events: HockeyEvent[]): MatchStats {
  const live = events.filter((e) => !e.deleted_at && !e.is_opponent);

  const countsByType: Partial<Record<EventType, number>> = {};
  const perPlayer = new Map<string, PlayerMatchStats>();

  const getPlayer = (id: string) => {
    if (!perPlayer.has(id)) perPlayer.set(id, emptyPlayerStats(id));
    return perPlayer.get(id)!;
  };

  let ourScore = 0;

  for (const event of live) {
    countsByType[event.event_type] = (countsByType[event.event_type] ?? 0) + 1;

    if (SCORING_TYPES.includes(event.event_type)) ourScore += 1;

    if (!event.player_id) continue;
    const stats = getPlayer(event.player_id);

    switch (event.event_type) {
      case "BALL_WIN": stats.ballWins += 1; break;
      case "TURNOVER": stats.turnovers += 1; break;
      case "ENTRY_25": stats.entries25 += 1; break;
      case "CIRCLE_ENTRY": stats.circleEntries += 1; break;
      case "SHOT": stats.shots += 1; break;
      case "CHANCE": stats.chances += 1; break;
      case "GOAL":
      case "PC_GOAL":
        stats.goals += 1;
        if (event.secondary_player_id) getPlayer(event.secondary_player_id).assists += 1;
        break;
      case "PC_WON": stats.pcWon += 1; break;
      case "INTERCEPTION": stats.interceptions += 1; break;
      case "TACKLE": stats.tackles += 1; break;
      default: break;
    }
  }

  return { ourScore, countsByType, perPlayer };
}

/**
 * Team-level only, by design (spec §16: no opponent roster, ever, so no
 * per-player breakdown is possible or meaningful here) — event counts for
 * the opponent's side of the same match, for a defensive summary/funnel.
 */
export function computeOpponentEventCounts(events: HockeyEvent[]): Partial<Record<EventType, number>> {
  const countsByType: Partial<Record<EventType, number>> = {};
  for (const event of events) {
    if (event.deleted_at || !event.is_opponent) continue;
    countsByType[event.event_type] = (countsByType[event.event_type] ?? 0) + 1;
  }
  return countsByType;
}
