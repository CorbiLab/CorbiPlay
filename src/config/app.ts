/**
 * Central place for the app's display name — the product name is explicitly
 * "temporary and must remain easily configurable" per the product spec.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Hockey Trace";

export const DEFAULT_QUARTERS = 4;
export const DEFAULT_QUARTER_DURATION_MINUTES = 15;
export const MATCH_ROSTER_SIZE = 16;
export const ON_FIELD_SIZE = 11;
export const BENCH_SIZE = 5;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
