import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type EmailOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

/**
 * Exchanges a Supabase auth email's link for a session, then forwards to
 * wherever that flow needs next (password reset today; the same route
 * handles signup confirmation later without change).
 *
 * Handles the link Supabase's *default* email templates actually produce —
 * `resetPasswordForEmail`'s `redirectTo` (this route) gets Supabase's own
 * hosted verify endpoint's `?code=...` appended after it checks the token
 * server-side (PKCE flow, `exchangeCodeForSession`). No custom SMTP or
 * template edit needed for this — Supabase only requires SMTP to let you
 * edit a template's subject/body, not to use the link it already sends.
 * `token_hash`/`type` (`verifyOtp`) is also handled, only relevant if the
 * template is later customised to call this route directly instead.
 *
 * Either way, this app's URL must be in Authentication → URL Configuration
 * → Redirect URLs in the Supabase dashboard, or Supabase silently drops the
 * redirect and sends the browser to the project's bare Site URL instead.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  }

  redirect("/login");
}
