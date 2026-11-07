"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError, SESSION_TIMEOUT_NOTICE } from "@/lib/auth-errors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // El middleware manda aquí con ?e=timeout cuando Supabase no respondió a tiempo.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("e") === "timeout") setError(SESSION_TIMEOUT_NOTICE);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let aal: { currentLevel?: string | null; nextLevel?: string | null } | null = null;
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        setError(friendlyAuthError(error, "admin"));
        return;
      }
      // Si la cuenta tiene 2FA activo, pide el código antes de dejarlo entrar.
      const res = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      aal = res.data;
    } catch (err) {
      setLoading(false);
      setError(friendlyAuthError(err, "admin"));
      return;
    }
    setLoading(false);

    if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      router.push("/mfa-challenge");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div>
      <h1 className="text-lg font-semibold">Inicia sesión</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Accede a tu BackOffice.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Correo</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="tu@empresa.com"
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
            placeholder="••••••••"
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
          <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Crea una organización
        </Link>
      </p>
    </div>
  );
}
