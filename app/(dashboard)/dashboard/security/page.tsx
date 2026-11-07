"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const supabase = createClient();
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === "verified");
    setEnrolled(!!verified);
    setFactorId(verified?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setError(null);
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (enrollError || !data || data.type !== "totp") {
      setError(enrollError?.message ?? "No se pudo iniciar la activación");
      return;
    }
    setPendingFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  async function verifyEnroll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pendingFactorId) return;
    const supabase = createClient();

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: pendingFactorId });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "No se pudo verificar");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    setEnrolling(false);
    setCode("");
    await refresh();
  }

  async function disable() {
    if (!factorId) return;
    if (!confirm("¿Desactivar la verificación en dos pasos?")) return;
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId });
    await refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seguridad</h1>
        <p className="text-sm text-muted-foreground">Verificación en dos pasos (2FA) para tu cuenta.</p>
      </div>

      {enrolled ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={18} />
            <span className="text-sm font-medium">2FA activado</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta pide un código de tu app de autenticación cada vez que inicias sesión.
          </p>
          <button
            onClick={disable}
            className="mt-4 flex items-center gap-1.5 rounded-md border border-red-500/30 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10"
          >
            <ShieldOff size={14} /> Desactivar 2FA
          </button>
        </div>
      ) : !enrolling ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Agrega una capa extra de seguridad: además de tu contraseña, se pedirá un código de 6 dígitos generado por
            una app como Google Authenticator o Authy.
          </p>
          <button
            onClick={startEnroll}
            className="mt-4 flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <ShieldCheck size={14} /> Activar 2FA
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium">1. Escanea este código con tu app de autenticación</p>
          {qrCode && (
            <div
              className="my-3 flex justify-center rounded-lg bg-white p-4"
              dangerouslySetInnerHTML={{ __html: qrCode }}
            />
          )}
          {secret && (
            <p className="text-center text-xs text-muted-foreground">
              O ingresa manualmente: <code className="rounded bg-muted px-1">{secret}</code>
            </p>
          )}

          <form onSubmit={verifyEnroll} className="mt-4 space-y-2">
            <label className="text-sm font-medium">2. Escribe el código de 6 dígitos</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-primary/40"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEnrolling(false)}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Verificar y activar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
