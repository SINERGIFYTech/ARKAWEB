"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChristmasBonusPreviewRow, ChristmasBonusHistoryRow } from "@/modules/rankflow/repository";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export function ChristmasBonusClient({
  year,
  enabled,
  basedOn,
  percent,
  preview,
  history,
  isDemo,
}: {
  year: number;
  enabled: boolean;
  basedOn: "PERSONAL" | "TEAM";
  percent: number;
  preview: ChristmasBonusPreviewRow[];
  history: ChristmasBonusHistoryRow[];
  isDemo: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = preview.reduce((sum, r) => sum + r.amount, 0);
  const alreadyPaidIds = new Set(history.map((h) => h.fullName)); // aproximado, solo para aviso visual

  function changeYear(y: number) {
    router.push(`/dashboard/rankflow/christmas-bonus?year=${y}`);
  }

  async function handlePay() {
    setPaying(true);
    setError(null);
    const res = await fetch("/api/rankflow/christmas-bonus/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year }),
    });
    setPaying(false);
    setConfirming(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo pagar");
      return;
    }
    const body = await res.json();
    setMessage(`Pagado a ${body.paid} distribuidor(es): ${fmt(body.totalAmount)}`);
    router.refresh();
  }

  if (!enabled) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">Bono Decembrino</h1>
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Está desactivado en el Plan de compensación. Actívalo ahí para poder calcularlo.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bono Decembrino {year}</h1>
          <p className="text-sm text-muted-foreground">
            {(percent * 100).toFixed(1)}% del volumen {basedOn === "TEAM" ? "de equipo" : "personal"} del año
            {isDemo && " · datos de ejemplo"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => changeYear(year - 1)} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">←</button>
          <span className="px-2 text-sm font-medium">{year}</span>
          <button onClick={() => changeYear(year + 1)} className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted">→</button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total a pagar (vista previa)</p>
            <p className="text-2xl font-semibold">{fmt(total)}</p>
          </div>
          {!isDemo && preview.length > 0 && !confirming && (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Pagar bono decembrino {year}
            </button>
          )}
          {confirming && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-600">¿Pagar {fmt(total)} a {preview.length} personas? No se puede deshacer.</span>
              <button onClick={() => setConfirming(false)} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                Cancelar
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {paying ? "Pagando..." : "Sí, pagar"}
              </button>
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        {message && <p className="mt-2 text-xs text-emerald-600">{message}</p>}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Ya pagado antes para este año no se vuelve a pagar (protegido en base de datos).
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Distribuidor</th>
              <th className="px-4 py-3 font-medium">Volumen base</th>
              <th className="px-4 py-3 font-medium">Bono</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((r) => (
              <tr key={r.distributorId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.fullName}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmt(r.baseVolume)}</td>
                <td className="px-4 py-3 font-semibold">{fmt(r.amount)}</td>
              </tr>
            ))}
            {preview.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Sin volumen registrado en {year}.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {history.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Ya pagado en {year}</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-medium">{h.fullName}</td>
                    <td className="px-4 py-2">{fmt(h.amount)}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(h.paidAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
