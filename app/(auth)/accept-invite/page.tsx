"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    // La sesión ya quedó activa por el link de invitación (Supabase la detecta
    // automáticamente en la URL al cargar la página).
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    // Marca su membresía (INVITED → ACTIVE) ahora que ya tiene contraseña.
    const res = await fetch("/api/team/accept-invite", { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo activar tu cuenta");
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
