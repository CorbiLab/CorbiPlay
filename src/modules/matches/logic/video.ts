/**
 * A match's video is a link, not a stored file (see the migration note on
 * `matches.video_url`) — this only ever computes a timestamp/URL to open,
 * never touches any video data itself.
 */

/**
 * Video time for a moment in the match, given which quarter it's in and how
 * far into that quarter (see clock.ts's getQuarterElapsedMs) — not
 * match_elapsed_ms, which is nominal and drifts across real quarter breaks.
 * Null if that quarter's offset was never set.
 */
export function getVideoTimestampMs(
  offsetsMs: Record<string, number>,
  quarter: number,
  quarterElapsedMs: number
): number | null {
  const offset = offsetsMs[String(quarter)];
  if (offset == null) return null;
  return offset + quarterElapsedMs;
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"]);

/**
 * Deep-links into the moment itself when the host supports it (YouTube's
 * `&t=Xs`); otherwise returns the link as-is — still useful, just not
 * pre-seeked, so this never happens to fail. `null` in means the offset for
 * that quarter hasn't been set — plain link, no fabricated timestamp.
 */
export function getVideoUrlAt(videoUrl: string, timestampMs: number | null): string {
  if (timestampMs == null) return videoUrl;

  let url: URL;
  try {
    url = new URL(videoUrl);
  } catch {
    return videoUrl;
  }

  const seconds = Math.max(0, Math.floor(timestampMs / 1000));
  if (YOUTUBE_HOSTS.has(url.hostname)) {
    url.searchParams.set("t", `${seconds}s`);
    return url.toString();
  }

  return videoUrl;
}
