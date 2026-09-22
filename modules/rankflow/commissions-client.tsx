"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { calculateAllCommissions, calculateTotalCommission } from "@/modules/rankflow/commission-engine";
import type { DistributorNode } from "@/modules/rankflow/data";
import type { CompensationPlanConfig } from "@/modules/rankflow/plan-config";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export function CommissionsClient({
  distributors,
  config,
  isDemo,
}: {
  distributors: DistributorNode[];
  config: CompensationPlanConfig;
  isDemo: boolean;
}) {
  const [selectedId, setSelectedId] = useState(distributors[0]?.id ?? "");

  if (distributors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Aún no hay distribuidores para calcular comisiones. Ve a Genealogía y da de alta al primero.
      </div>
    );
  }

  const all = calculateAllCommissions(distributors, config);
  const totalPeriod = all.reduce((sum, r) => sum + r.total, 0);
  const detail = calculateTotalCommission(distributors, config, selectedId);
  const selected = distributors.find((d) => d.id === selectedId)!;

  const enabledParts = [
    config.binary.enabled && "binario",
    config.unilevel.enabled && "unilevel",
    config.generation.enabled && "generacional",
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comisiones</h1>
          <p className="text-sm text-muted-foreground">
            Corte de la semana — plan {enabledParts.join(" + ") || "sin componentes activos"} · total del periodo: {fmt(totalPeriod)}
            {isDemo && " · datos de ejemplo"}
          </p>
        </div>
        <Link
          href="/dashboard/rankflow/settings"
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <Settings size={14} /> Plan de compensación
        </Link>
      </div>

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
