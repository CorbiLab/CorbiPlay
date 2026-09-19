import { describe, expect, it } from "vitest";
import { getPitchZone, TAP_ZONES } from "./pitch-zones";

describe("getPitchZone", () => {
  it("identifies the defensive 25 when attacking right", () => {
    expect(getPitchZone(10, 50, "RIGHT")).toBe("DEFENSIVE_25_CENTER");
  });

  it("identifies the attacking 25 when attacking right", () => {
    expect(getPitchZone(80, 50, "RIGHT")).toBe("ATTACKING_25_CENTER");
  });

  it("flips defensive/attacking when attacking left", () => {
    // x=10 is within the circle-proximity band (<=15) at central width, so it's
    // CIRCLE rather than a plain attacking-25 zone — covered by its own test below.
    expect(getPitchZone(20, 50, "LEFT")).toBe("ATTACKING_25_CENTER");
    expect(getPitchZone(80, 50, "LEFT")).toBe("DEFENSIVE_25_CENTER");
  });

  it("splits the middle third at the halfway line into an own-half and opposition-half band", () => {
    // Attacking right: own half is x in (25, 50], opposition half is x in (50, 75).
    expect(getPitchZone(40, 50, "RIGHT")).toBe("MIDDLE_DEFENSIVE_CENTER");
    expect(getPitchZone(50, 50, "RIGHT")).toBe("MIDDLE_DEFENSIVE_CENTER"); // halfway line itself
    expect(getPitchZone(60, 50, "RIGHT")).toBe("MIDDLE_ATTACKING_CENTER");
  });

  it("flips which half of the middle is 'defensive' vs 'attacking' when attacking left", () => {
    expect(getPitchZone(60, 50, "LEFT")).toBe("MIDDLE_DEFENSIVE_CENTER");
    expect(getPitchZone(40, 50, "LEFT")).toBe("MIDDLE_ATTACKING_CENTER");
  });

  it("identifies left/right channels by y", () => {
    expect(getPitchZone(40, 10, "RIGHT")).toBe("MIDDLE_DEFENSIVE_LEFT");
    expect(getPitchZone(40, 90, "RIGHT")).toBe("MIDDLE_DEFENSIVE_RIGHT");
  });

  it("identifies the circle near the attacking backline, central width", () => {
    expect(getPitchZone(92, 50, "RIGHT")).toBe("CIRCLE");
    expect(getPitchZone(8, 50, "LEFT")).toBe("CIRCLE");
  });

  it("does not treat the attacking-25 corner (wide) as the circle", () => {
    expect(getPitchZone(92, 5, "RIGHT")).toBe("ATTACKING_25_LEFT");
  });
});

describe("TAP_ZONES — the live-encoding touch grid (spec §75/§87)", () => {
  it("has exactly 12 zones covering the pitch with no gaps or overlaps", () => {
    expect(TAP_ZONES).toHaveLength(12);
    // 4 uniform x-bands x 3 y-bands, each fully covering its slice.
    const xEdges = new Set(TAP_ZONES.flatMap((z) => z.xRange));
    const yEdges = new Set(TAP_ZONES.flatMap((z) => z.yRange));
    expect([...xEdges].sort((a, b) => a - b)).toEqual([0, 25, 50, 75, 100]);
    expect([...yEdges].sort((a, b) => a - b)).toEqual([0, 33.33, 66.67, 100]);
  });

  it("every zone's centre point falls inside its own bounds and resolves back to a sensible PitchZone", () => {
    for (const zone of TAP_ZONES) {
      expect(zone.centerX).toBeGreaterThanOrEqual(zone.xRange[0]);
      expect(zone.centerX).toBeLessThanOrEqual(zone.xRange[1]);
      expect(zone.centerY).toBeGreaterThanOrEqual(zone.yRange[0]);
      expect(zone.centerY).toBeLessThanOrEqual(zone.yRange[1]);
      // Never throws / never falls through to an unexpected value.
      expect(getPitchZone(zone.centerX, zone.centerY, "RIGHT")).toMatch(/^(DEFENSIVE_25|MIDDLE_DEFENSIVE|MIDDLE_ATTACKING|ATTACKING_25|CIRCLE)/);
    }
  });

  it("marks exactly the two end-centre cells as the visual circle", () => {
    const circleZones = TAP_ZONES.filter((z) => z.isCircle);
    expect(circleZones).toHaveLength(2);
    expect(circleZones.map((z) => z.centerX).sort((a, b) => a - b)).toEqual([12.5, 87.5]);
  });
});
