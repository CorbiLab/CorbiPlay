"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, requestPasswordReset, type AuthActionState } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);
  const [forgotState, forgotAction, forgotPending] = useActionState(requestPasswordReset, initialState);

  if (mode === "forgot") {
    return (
      <div className="space-y-4">
        <form action={forgotAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input id="forgot-email" name="email" type="email" autoComplete="email" required />
          </div>
          {forgotState?.error && <p className="text-sm text-destructive">{forgotState.error}</p>}
          {forgotState?.message && <p className="text-sm text-category-possession">{forgotState.message}</p>}
          <Button type="submit" className="w-full" disabled={forgotPending}>
            {forgotPending ? "..." : "Envoyer le lien de réinitialisation"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode("signin")}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  const isSignIn = mode === "signin";
  const state = isSignIn ? signInState : signUpState;
  const action = isSignIn ? signInAction : signUpAction;
  const pending = isSignIn ? signInPending : signUpPending;

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignIn ? "current-password" : "new-password"}
            required
          />
        </div>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.message && <p className="text-sm text-category-possession">{state.message}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "..." : isSignIn ? "Se connecter" : "Créer le compte"}
        </Button>
      </form>

      {isSignIn && (
        <button
          type="button"
          onClick={() => setMode("forgot")}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Mot de passe oublié ?
        </button>
      )}

      <button
        type="button"
        onClick={() => setMode(isSignIn ? "signup" : "signin")}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {isSignIn ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}
