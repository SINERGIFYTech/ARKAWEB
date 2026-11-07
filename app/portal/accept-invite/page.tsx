"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PortalAcceptInvitePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("No se encontró una sesión válida en el link.");
        }
        setReady(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "El link no es válido o ya expiró.";
        setSessionError(message);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      router.push("/portal");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar la contraseña.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        {sessionError ? (
          <>
            <h1 className="text-lg font-semibold">Este link ya no funciona</h1>
            <p className="mt-2 text-sm text-muted-foreground">{sessionError}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Pide que te vuelvan a invitar, o usa{" "}
              <a href="/portal/forgot-password" className="font-medium text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </a>{" "}
              si ya tenías cuenta.
            </p>
          </>
        ) : !ready ? (
          <p className="text-sm text-muted-foreground">Verificando tu link...</p>
        ) : (
          <>
            <h1 className="text-lg font-semibold">Crea tu contraseña</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ya te dieron acceso a tu portal — solo falta esto.</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Entrar"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
