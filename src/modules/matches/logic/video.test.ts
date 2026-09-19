import { describe, expect, it } from "vitest";
import { getVideoTimestampMs, getVideoUrlAt } from "./video";

describe("getVideoTimestampMs", () => {
  it("adds the quarter's video offset to the quarter-elapsed time", () => {
    const offsets = { "1": 120_000, "3": 3_000_000 };
    expect(getVideoTimestampMs(offsets, 1, 5_000)).toBe(125_000);
    expect(getVideoTimestampMs(offsets, 3, 90_000)).toBe(3_090_000);
  });

  it("returns null for a quarter whose offset was never set", () => {
    expect(getVideoTimestampMs({ "1": 120_000 }, 2, 5_000)).toBeNull();
  });
});

describe("getVideoUrlAt", () => {
  it("appends a YouTube timestamp", () => {
    expect(getVideoUrlAt("https://www.youtube.com/watch?v=abc123", 125_000)).toBe(
      "https://www.youtube.com/watch?v=abc123&t=125s"
    );
  });

  it("returns the plain URL when the timestamp is unknown", () => {
    expect(getVideoUrlAt("https://www.youtube.com/watch?v=abc123", null)).toBe(
      "https://www.youtube.com/watch?v=abc123"
    );
  });

  it("returns the plain URL for a non-YouTube host — still a useful link, just not seeked", () => {
    expect(getVideoUrlAt("https://veo.co/matches/xyz", 125_000)).toBe("https://veo.co/matches/xyz");
  });

  it("never throws on a malformed URL", () => {
    expect(getVideoUrlAt("not a url", 1000)).toBe("not a url");
  });
});
