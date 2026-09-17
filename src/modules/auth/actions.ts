"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/config/app";

export interface AuthActionState {
  error?: string;
  message?: string;
}

/** @deprecated kept for compatibility — use AuthActionState */
export type SignInState = AuthActionState;

export async function signIn(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email et mot de passe requis." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signUp(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email et mot de passe requis." };
  if (password.length < 6) return { error: "Le mot de passe doit faire au moins 6 caractères." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  if (data.session) {
    // Email confirmation is disabled on this project — the user is signed in immediately.
    redirect("/dashboard");
  }

  return {
    message: "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis reviens te connecter.",
  };
}

/**
 * Sends a password-reset email. Supabase never reveals whether the address
 * has an account (same response either way) — the generic message here
 * matches that, so this can't be used to enumerate registered emails.
 *
 * `redirectTo` must be in the Supabase project's Authentication → URL
 * Configuration → Redirect URLs allowlist, or Supabase silently drops it —
 * see the note in `src/app/auth/confirm/route.ts` for what happens to the
 * link from here (no custom SMTP/template edit needed).
 */
export async function requestPasswordReset(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  if (!email) return { error: "Email requis." };

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? `https://${headersList.get("host")}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  if (error) return { error: error.message };

  return { message: "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé." };
}

/**
 * Sets a new password — requires the recovery session established by
 * `/auth/confirm` after the emailed link is clicked (`updateUser` acts on
 * whichever session the request's cookies carry).
 */
export async function updatePassword(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  if (!password || password.length < 6) return { error: "Le mot de passe doit faire au moins 6 caractères." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
