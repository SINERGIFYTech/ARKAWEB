"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // El link de invitación/recuperación de Supabase puede llegar de dos formas:
  // con un token en el fragmento de la URL (#access_token=...), que el cliente
  // detecta solo, o con ?code=... (flujo PKCE, el default en proyectos nuevos de
  // Supabase), que hay que intercambiar explícitamente por una sesión.
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
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Marca su membresía (INVITED → ACTIVE) ahora que ya tiene contraseña.
      const res = await fetch("/api/team/accept-invite", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "No se pudo activar tu cuenta");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar la contraseña.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (sessionError) {
    return (
      <div>
        <h1 className="text-lg font-semibold">Este link ya no funciona</h1>
        <p className="mt-2 text-sm text-muted-foreground">{sessionError}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Pide que te inviten de nuevo, o usa{" "}
          <a href="/forgot-password" className="font-medium text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </a>{" "}
          si ya tenías cuenta.
        </p>
      </div>
    );
  }

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Verificando tu link...</p>;
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">Crea tu contraseña</h1>
      <p className="mt-1 text-sm text-muted-foreground">Ya fuiste invitado a un equipo — solo falta esto para entrar.</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
