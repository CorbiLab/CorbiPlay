export type AttackingDirection = "LEFT" | "RIGHT";

export type PitchZone =
  | "DEFENSIVE_25_LEFT"
  | "DEFENSIVE_25_CENTER"
  | "DEFENSIVE_25_RIGHT"
  | "MIDDLE_DEFENSIVE_LEFT"
  | "MIDDLE_DEFENSIVE_CENTER"
  | "MIDDLE_DEFENSIVE_RIGHT"
  | "MIDDLE_ATTACKING_LEFT"
  | "MIDDLE_ATTACKING_CENTER"
  | "MIDDLE_ATTACKING_RIGHT"
  | "ATTACKING_25_LEFT"
  | "ATTACKING_25_CENTER"
  | "ATTACKING_25_RIGHT"
  | "CIRCLE";

/**
 * Zones are always DERIVED from raw normalised (x, y) coordinates, never
 * stored (spec §27/28) — this function is the single, configurable place
 * that defines the boundaries, so changing them later never needs a data
 * migration. Coordinates are 0-100 along pitch length (x) and width (y).
 *
 * 12 zones (4 length-bands x 3 width-lanes) + the circle: the midfield used
 * to be one 50-unit-wide band per lane (twice the width of a 25-unit
 * DEFENSIVE_25/ATTACKING_25 band) — split at the halfway line into
 * MIDDLE_DEFENSIVE (own half) and MIDDLE_ATTACKING (opposition half) so
 * every length-band is a uniform 25 units, on request once the original 9
 * felt too coarse in the middle third.
 *
 * `x=25`/`x=75` approximate the 23m lines (simplified to a round number for
 * MVP); the circle is approximated as the attacking-25 area within 15% of the
 * backline and within the middle 60% of the pitch width — a reasonable
 * stand-in for the real ~14.63m-radius shooting circle until this is
 * revisited with an exact ellipse test.
 */
export function getPitchZone(x: number, y: number, attackingDirection: AttackingDirection): PitchZone {
  const attackingRight = attackingDirection === "RIGHT";

  const isDefensive25 = attackingRight ? x <= 25 : x >= 75;
  const isAttacking25 = attackingRight ? x >= 75 : x <= 25;
  const isMiddleDefensiveHalf = attackingRight ? x > 25 && x <= 50 : x >= 50 && x < 75;

  const nearAttackingBackline = attackingRight ? x >= 85 : x <= 15;
  const withinCircleWidth = y >= 20 && y <= 80;

  if (isAttacking25 && nearAttackingBackline && withinCircleWidth) {
    return "CIRCLE";
  }

  const xZone = isDefensive25
    ? "DEFENSIVE_25"
    : isAttacking25
      ? "ATTACKING_25"
      : isMiddleDefensiveHalf
        ? "MIDDLE_DEFENSIVE"
        : "MIDDLE_ATTACKING";
  const yZone = y < 33.33 ? "LEFT" : y > 66.67 ? "RIGHT" : "CENTER";

  return `${xZone}_${yZone}` as PitchZone;
}

/** Real field-hockey pitch proportions (metres), used by <HockeyPitch />. */
export const PITCH_LENGTH_M = 91.4;
export const PITCH_WIDTH_M = 55;
export const QUARTER_LINE_X = 25;
export const TWENTY_THREE_M_LINE_X = 25; // see note above — approximated at 25% for round numbers

export interface TapZone {
  id: string;
  xRange: [number, number];
  yRange: [number, number];
  centerX: number;
  centerY: number;
  /** Purely visual — the two end-centre cells are drawn as the shooting circle. */
  isCircle?: boolean;
}

/**
 * Large touch targets for the live-encoding pitch (spec §75/§87 — iPad
 * landscape, big forgiving taps, not precision tapping). A tap always
 * resolves to this zone's centre point, which is what gets stored on
 * hockey_events.start_x/start_y — so the exact same `getPitchZone()` above
 * still classifies it correctly later; this grid is purely an interaction
 * concern, not a second source of truth. 4 columns (defensive 25 / own half
 * / opposition half / attacking 25, each a uniform 25 units) x 3 rows
 * (left/centre/right channel) = 12 zones, matching the 12 named PitchZone
 * buckets one-for-one. Splitting the old, twice-as-wide middle column in
 * half means its tap targets are now the same width as every other column,
 * not doubled — a real trade against spec §75/§87's "big, forgiving taps"
 * for the extra granularity requested there.
 */
export const TAP_ZONES: TapZone[] = [
  { id: "col0-row0", xRange: [0, 25], yRange: [0, 33.33], centerX: 12.5, centerY: 16.67 },
  { id: "col0-row1", xRange: [0, 25], yRange: [33.33, 66.67], centerX: 12.5, centerY: 50, isCircle: true },
  { id: "col0-row2", xRange: [0, 25], yRange: [66.67, 100], centerX: 12.5, centerY: 83.33 },
  { id: "col1-row0", xRange: [25, 50], yRange: [0, 33.33], centerX: 37.5, centerY: 16.67 },
  { id: "col1-row1", xRange: [25, 50], yRange: [33.33, 66.67], centerX: 37.5, centerY: 50 },
  { id: "col1-row2", xRange: [25, 50], yRange: [66.67, 100], centerX: 37.5, centerY: 83.33 },
  { id: "col2-row0", xRange: [50, 75], yRange: [0, 33.33], centerX: 62.5, centerY: 16.67 },
  { id: "col2-row1", xRange: [50, 75], yRange: [33.33, 66.67], centerX: 62.5, centerY: 50 },
  { id: "col2-row2", xRange: [50, 75], yRange: [66.67, 100], centerX: 62.5, centerY: 83.33 },
  { id: "col3-row0", xRange: [75, 100], yRange: [0, 33.33], centerX: 87.5, centerY: 16.67 },
  { id: "col3-row1", xRange: [75, 100], yRange: [33.33, 66.67], centerX: 87.5, centerY: 50, isCircle: true },
  { id: "col3-row2", xRange: [75, 100], yRange: [66.67, 100], centerX: 87.5, centerY: 83.33 },
];
