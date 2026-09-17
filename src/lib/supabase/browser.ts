import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase client. Live encoding (modules/live-encoding) writes
 * directly through this client rather than via Server Actions — see
 * docs/OFFLINE_STRATEGY.md for why: it lets the offline outbox retry writes
 * without depending on the Next.js server being reachable at all.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
