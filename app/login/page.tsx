"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  function switchMode(next: "login" | "register" | "forgot") {
    setMode(next);
    setError("");
    setSuccess("");
  }

  async function handleGoogleLogin() {
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "forgot") {
      const origin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      });
      if (error) {
        setError("Nie udało się wysłać emaila. Sprawdź adres i spróbuj ponownie.");
      } else {
        setSuccess("Sprawdź skrzynkę — wyślemy link do zresetowania hasła.");
      }
    } else if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Nieprawidłowy email lub hasło.");
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Sprawdź skrzynkę — wyślemy link potwierdzający.");
      }
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-4">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight">Co Dziś Odkryłam</h1>
          <p className="text-sm text-muted-foreground italic mt-1">Dziennik Uważności i Wdzięczności</p>
        </div>

        {mode !== "forgot" && (
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-3 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <GoogleIcon />
            Kontynuuj z Google
          </button>
        )}

        {mode !== "forgot" && (
          <div className="flex items-center gap-3 -mt-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">lub</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 -mt-4">
          {mode === "forgot" && (
            <p className="text-sm text-muted-foreground text-center">
              Podaj swój email — wyślemy link do zresetowania hasła.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
              placeholder="twoj@email.pl"
            />
          </div>

          {mode !== "forgot" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                Hasło
              </label>
              <input
                type="password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition"
                placeholder="••••••••"
              />
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs text-muted-foreground hover:text-foreground text-right transition-colors"
                >
                  Zapomniałam hasła
                </button>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {success && <p className="text-sm text-primary text-center">{success}</p>}

          <Button type="submit" disabled={loading} className="mt-1">
            {loading
              ? "…"
              : mode === "login"
              ? "Zaloguj się"
              : mode === "register"
              ? "Utwórz konto"
              : "Wyślij link"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground -mt-4">
          {mode === "forgot" ? (
            <>
              <button
                type="button"
                className="underline text-foreground hover:text-primary transition-colors"
                onClick={() => switchMode("login")}
              >
                Wróć do logowania
              </button>
            </>
          ) : mode === "login" ? (
            <>
              Nie masz konta?{" "}
              <button
                type="button"
                className="underline text-foreground hover:text-primary transition-colors"
                onClick={() => switchMode("register")}
              >
                Zarejestruj się
              </button>
            </>
          ) : (
            <>
              Masz już konto?{" "}
              <button
                type="button"
                className="underline text-foreground hover:text-primary transition-colors"
                onClick={() => switchMode("login")}
              >
                Zaloguj się
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
