import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60rem 30rem at 50% -10%, color-mix(in oklch, var(--primary) 18%, transparent), transparent)",
        }}
      />

      <div className="relative w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
            HT
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
            <p className="text-sm text-muted-foreground">Choisis un nouveau mot de passe pour ton compte</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/20">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
