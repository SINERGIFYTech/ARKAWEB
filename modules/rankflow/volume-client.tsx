"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DistributorNode } from "@/modules/rankflow/data";
import type { VolumeEntryRow } from "@/modules/rankflow/repository";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;

export function VolumeClient({
  distributors,
  entries,
  periodLabel,
  isDemo,
}: {
  distributors: DistributorNode[];
  entries: VolumeEntryRow[];
  periodLabel: string | null;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [distributorId, setDistributorId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sorted = [...distributors].sort((a, b) => a.fullName.localeCompare(b.fullName));
  const totalPeriod = entries.reduce((sum, e) => sum + e.amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!distributorId) {
      setError("Elige un distribuidor");
      return;
    }
    const amountNum = Number(amount);
    if (!(amountNum > 0)) {
      setError("El monto debe ser mayor a cero");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/rankflow/volume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distributorId, amount: amountNum, note }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo capturar el volumen");
      return;
    }

    setAmount("");
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Captura de volumen</h1>
        <p className="text-sm text-muted-foreground">
          Registra ventas/volumen de cada distribuidor contra el periodo abierto
          {isDemo && " · modo demo, no se guarda nada"}
        </p>
        {periodLabel && <p className="mt-1 text-xs font-medium text-primary">Periodo abierto: {periodLabel}</p>}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Nueva captura</h2>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Distribuidor</label>
            <select
              value={distributorId}
              onChange={(e) => setDistributorId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Selecciona...</option>
              {sorted.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName} ({d.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Monto</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nota (opcional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ej. Pedido #1042"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || isDemo}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Capturar"}
          </button>
        </form>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total capturado este periodo</p>
            <p className="mt-1 text-2xl font-semibold">{fmt(totalPeriod)}</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Distribuidor</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                  <th className="px-4 py-3 font-medium">Nota</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{e.distributorName}</td>
                    <td className="px-4 py-3">{fmt(e.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.note ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Sin capturas todavía en este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
