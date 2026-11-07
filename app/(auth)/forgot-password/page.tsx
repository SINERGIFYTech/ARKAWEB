"use client";

import { useState } from "react";
import { getSiteUrl } from "@/lib/site-url";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const siteUrl = getSiteUrl(window.location.origin);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/accept-invite`,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-lg font-semibold">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Si <strong>{email}</strong> tiene una cuenta, te mandamos un link para poner una contraseña nueva.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">¿Olvidaste tu contraseña?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Te mandamos un link para poner una nueva.</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Mandar link"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">← Volver a iniciar sesión</Link>
      </p>
    </div>
  );
}
