"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, History, Lock } from "lucide-react";
import { calculateAllCommissions } from "@/modules/rankflow/commission-engine";
import type { DistributorNode } from "@/modules/rankflow/data";
import type { CompensationPlanConfig } from "@/modules/rankflow/plan-config";
import type { CommissionPeriod } from "@/modules/rankflow/repository";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export function CommissionsClient({
  distributors,
  config,
  isDemo,
  period,
  paidRankBonuses,
}: {
  distributors: DistributorNode[];
  config: CompensationPlanConfig;
  isDemo: boolean;
  period: CommissionPeriod | null;
  paidRankBonuses: Record<string, string[]>;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(distributors[0]?.id ?? "");
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (distributors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Aún no hay distribuidores para calcular comisiones. Ve a Genealogía y da de alta al primero.
      </div>
    );
  }

  const all = calculateAllCommissions(distributors, config, { paidRankBonuses });
  const totalPeriod = all.reduce((sum, r) => sum + r.total, 0);
  const detail = all.find((r) => r.distributor.id === selectedId) ?? all[0];
  const selected = distributors.find((d) => d.id === selectedId)!;

  const enabledParts = [
    config.binary.enabled && "binario",
    config.unilevel.enabled && "unilevel",
    config.generation.enabled && "generacional",
    config.rankBonus.enabled && "bono de rango",
    config.matching.enabled && "matching",
    config.fastStart.enabled && "inicio rápido",
    config.globalBonus.enabled && "global",
  ].filter(Boolean);

  async function handleClose() {
    setClosing(true);
    setError(null);
    const res = await fetch("/api/rankflow/commissions/close-period", { method: "POST" });
    setClosing(false);
    setConfirming(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo cerrar el periodo");
      return;
    }
    const body = await res.json();
    setResult(
      `Periodo "${body.periodLabel}" cerrado: ${body.distributorsPaid} distribuidor(es), ${fmt(body.totalPaid)} en total. Se abrió "${body.nextPeriodLabel}".`
    );
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comisiones</h1>
          <p className="text-sm text-muted-foreground">
            Plan {enabledParts.join(" + ") || "sin componentes activos"} · vista previa en vivo: {fmt(totalPeriod)}
            {isDemo && " · datos de ejemplo"}
          </p>
          {period && <p className="mt-1 text-xs font-medium text-primary">Periodo abierto: {period.label}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/rankflow/commissions/history"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <History size={14} /> Historial
          </Link>
          <Link
            href="/dashboard/rankflow/settings"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <Settings size={14} /> Plan de compensación
          </Link>
        </div>
      </div>

      {!isDemo && period && (
        <div className="rounded-xl border border-border bg-card p-4">
          {!confirming ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Lock size={15} className="text-muted-foreground" />
                <span>
                  Cerrar <strong>{period.label}</strong> congela estos montos como pagados y abre el siguiente periodo. No se puede deshacer.
                </span>
              </div>
              <button
                onClick={() => setConfirming(true)}
                className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Cerrar periodo
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                ¿Seguro? Se pagará {fmt(totalPeriod)} entre {all.filter((r) => r.total > 0).length} distribuidor(es) y no se puede deshacer.
              </span>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClose}
                  disabled={closing}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {closing ? "Cerrando..." : "Sí, cerrar y pagar"}
                </button>
              </div>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          {result && <p className="mt-2 text-xs text-emerald-600">{result}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Distribuidor</th>
                <th className="px-4 py-3 font-medium">Rango</th>
                <th className="px-4 py-3 font-medium">Binario</th>
                <th className="px-4 py-3 font-medium">Unilevel</th>
                <th className="px-4 py-3 font-medium">Generacional</th>
                {config.rankBonus.enabled && <th className="px-4 py-3 font-medium">Bono rango</th>}
                {config.matching.enabled && <th className="px-4 py-3 font-medium">Matching</th>}
                {config.fastStart.enabled && <th className="px-4 py-3 font-medium">Inicio rápido</th>}
                {config.globalBonus.enabled && <th className="px-4 py-3 font-medium">Global</th>}
                {config.qualificationBonuses.length > 0 && <th className="px-4 py-3 font-medium">Calificación</th>}
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {all
                .sort((a, b) => b.total - a.total)
                .map((row) => (
                  <tr
                    key={row.distributor.id}
                    onClick={() => setSelectedId(row.distributor.id)}
                    className={`cursor-pointer border-b border-border last:border-0 hover:bg-muted/50 ${
                      row.distributor.id === selectedId ? "bg-accent" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{row.distributor.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.distributor.rank}</td>
                    <td className="px-4 py-3">{fmt(row.binary.capped)}</td>
                    <td className="px-4 py-3">{fmt(row.unilevel.total)}</td>
                    <td className="px-4 py-3">{fmt(row.generation.total)}</td>
                    {config.rankBonus.enabled && <td className="px-4 py-3">{fmt(row.rankBonus.amount)}</td>}
                    {config.matching.enabled && <td className="px-4 py-3">{fmt(row.matching.total)}</td>}
                    {config.fastStart.enabled && <td className="px-4 py-3">{fmt(row.fastStart)}</td>}
                    {config.globalBonus.enabled && <td className="px-4 py-3">{fmt(row.globalBonus)}</td>}
                    {config.qualificationBonuses.length > 0 && <td className="px-4 py-3">{fmt(row.qualificationBonus)}</td>}
                    <td className="px-4 py-3 font-semibold">{fmt(row.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Desglose</p>
            <p className="text-sm font-semibold">{selected.fullName} · {selected.rank}</p>

            <div className="mt-3 space-y-2 text-sm">
              {config.binary.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Binario (pierna menor)</span>
                    <span className="font-medium">{fmt(detail.binary.capped)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Izq {fmt(detail.binary.leftVol ?? 0)} · Der {fmt(detail.binary.rightVol ?? 0)} · tope{" "}
                    {detail.binary.cap === Infinity ? "sin tope" : fmt(detail.binary.cap)}
                    {detail.binary.raw > detail.binary.cap && (
                      <span className="text-amber-600"> · excedente descartado ({fmt(detail.binary.raw - detail.binary.cap)})</span>
                    )}
                  </p>
                </>
              )}

              {config.unilevel.enabled && (
                <>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground">Unilevel</span>
                    <span className="font-medium">{fmt(detail.unilevel.total)}</span>
                  </div>
                  {detail.unilevel.byLevel.map((l) => (
                    <p key={l.level} className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Nivel {l.level} ({(l.percent * 100).toFixed(0)}%)</span>
                      <span>{fmt(l.commission)}</span>
                    </p>
                  ))}
                </>
              )}

              {config.generation.enabled && (
                <>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground">Generacional</span>
                    <span className="font-medium">{fmt(detail.generation.total)}</span>
                  </div>
                  {!detail.generation.qualifies && (
                    <p className="text-[11px] text-muted-foreground">
                      No califica (requiere rango {config.generation.minRankToEarn}+)
                    </p>
                  )}
                  {detail.generation.byGeneration.map((g) => (
                    <p key={g.generation} className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Gen {g.generation} · {g.leaderCount} líder(es) ({(g.percent * 100).toFixed(0)}%)</span>
                      <span>{fmt(g.commission)}</span>
                    </p>
                  ))}
                </>
              )}

              {config.rankBonus.enabled && (
                <>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground">
                      Bono de rango ({config.rankBonus.mode === "ONE_TIME" ? "bienvenida" : "mensual"})
                    </span>
                    <span className="font-medium">{fmt(detail.rankBonus.amount)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {detail.rankBonus.rank ? `Califica a ${detail.rankBonus.rank}` : "Sin rango calificado"}
                    {detail.rankBonus.amount === 0 && config.rankBonus.mode === "ONE_TIME" && detail.rankBonus.rank &&
                      (paidRankBonuses[detail.distributor.id] ?? []).includes(detail.rankBonus.rank) &&
                      " · bono de bienvenida ya cobrado antes"}
                  </p>
                </>
              )}

              {config.matching.enabled && (
                <>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground">Matching</span>
                    <span className="font-medium">{fmt(detail.matching.total)}</span>
                  </div>
                  {detail.matching.byLevel.map((l) => (
                    <p key={l.level} className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Nivel {l.level} ({(l.percent * 100).toFixed(0)}% de {fmt(l.base)})</span>
                      <span>{fmt(l.commission)}</span>
                    </p>
                  ))}
                </>
              )}

              {config.fastStart.enabled && detail.fastStart > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-muted-foreground">Inicio rápido</span>
                  <span className="font-medium">{fmt(detail.fastStart)}</span>
                </div>
              )}
              {config.globalBonus.enabled && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-muted-foreground">Bono global</span>
                  <span className="font-medium">{fmt(detail.globalBonus)}</span>
                </div>
              )}
              {config.qualificationBonuses.length > 0 && detail.qualificationBonus > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-muted-foreground">Calificación sostenida</span>
                  <span className="font-medium">{fmt(detail.qualificationBonus)}</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold">{fmt(detail.total)}</span>
            </div>
          </div>

          <Link
            href="/dashboard/rankflow/settings"
            className="block rounded-xl border border-dashed border-border bg-card p-4 text-xs text-muted-foreground hover:bg-muted/50"
          >
            Estos porcentajes y topes se configuran en <span className="font-medium text-foreground">Plan de compensación</span> →
          </Link>
        </div>
      </div>
    </div>
  );
}
