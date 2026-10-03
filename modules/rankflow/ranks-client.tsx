"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { computeAllQualifications } from "@/modules/rankflow/rank-engine";
import type { DistributorNode } from "@/modules/rankflow/data";
import type { CompensationPlanConfig } from "@/modules/rankflow/plan-config";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export function RanksClient({
  distributors,
  config,
  isDemo,
  periodLabel,
}: {
  distributors: DistributorNode[];
  config: CompensationPlanConfig;
  isDemo: boolean;
  periodLabel: string | null;
}) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (distributors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Aún no hay distribuidores. Ve a Genealogía y da de alta al primero.
      </div>
    );
  }

  const qualifications = computeAllQualifications(distributors, config);
  const pending = qualifications.filter((q) => !q.matches);

  async function handleApply() {
    setApplying(true);
    setMessage(null);
    const res = await fetch("/api/rankflow/ranks/recalculate", { method: "POST" });
    setApplying(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "No se pudo aplicar");
      return;
    }
    const body = await res.json();
    setMessage(`${body.updated} rango(s) actualizado(s).`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rangos</h1>
          <p className="text-sm text-muted-foreground">
            Calificación automática por volumen personal y de equipo
            {isDemo && " · datos de ejemplo"}
          </p>
          {periodLabel && <p className="mt-1 text-xs font-medium text-primary">Con base en: {periodLabel}</p>}
        </div>
        <Link
          href="/dashboard/rankflow/settings"
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <Settings size={14} /> Requisitos de rango
        </Link>
      </div>

      {pending.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle size={16} />
            {pending.length} distribuidor(es) tienen un rango distinto al que les corresponde por volumen.
          </div>
          <button
            onClick={handleApply}
            disabled={applying}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <RefreshCw size={13} className={applying ? "animate-spin" : ""} />
            {applying ? "Aplicando..." : "Recalcular y aplicar"}
          </button>
        </div>
      )}

      {pending.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={16} />
          Todos los rangos están al día con el volumen actual.
        </div>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Distribuidor</th>
              <th className="px-4 py-3 font-medium">Rango actual</th>
              <th className="px-4 py-3 font-medium">Rango calificado</th>
              <th className="px-4 py-3 font-medium">Vol. personal</th>
              <th className="px-4 py-3 font-medium">Vol. de equipo</th>
            </tr>
          </thead>
          <tbody>
            {qualifications.map((q) => (
              <tr key={q.distributor.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{q.distributor.fullName}</td>
                <td className="px-4 py-3 text-muted-foreground">{q.currentRank}</td>
                <td className={`px-4 py-3 font-medium ${q.matches ? "text-foreground" : "text-amber-600"}`}>
                  {q.qualifiedRank}
                  {!q.matches && <span className="ml-1 text-[10px]">(cambia)</span>}
                </td>
                <td className="px-4 py-3">{fmt(q.personalVolume)}</td>
                <td className="px-4 py-3">{fmt(q.teamVolume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
