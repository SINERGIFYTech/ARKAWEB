"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError, SESSION_TIMEOUT_NOTICE } from "@/lib/auth-errors";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("e") === "timeout") setError(SESSION_TIMEOUT_NOTICE);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        setError(friendlyAuthError(error, "portal"));
        return;
      }
    } catch (err) {
      setLoading(false);
      setError(friendlyAuthError(err, "portal"));
      return;
    }
    setLoading(false);
    router.push("/portal");
    router.refresh();
  };

  return (
    <div className="surface-dark flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="surface-gradient stat-glow flex h-10 w-10 items-center justify-center rounded-xl">
            <Building2 size={20} />
          </div>
          <span className="text-base font-bold tracking-tight text-white">Portal de Distribuidor</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card p-6 shadow-2xl">
          <h1 className="text-lg font-semibold">Inicia sesión</h1>
          <p className="mt-1 text-sm text-muted-foreground">Accede a tu negocio.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <p className="text-center text-xs">
              <a href="/portal/forgot-password" className="text-muted-foreground hover:text-foreground hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
