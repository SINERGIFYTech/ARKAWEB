"use client";

import { useEffect, useState } from "react";
import { Clock, TrendingUp, Users2, Award } from "lucide-react";
import type { PortalDashboardData } from "@/modules/portal/repository";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

function useCountdown(endDate: string | null) {
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!endDate) return;
    const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000; // fin de día del end_date
    function tick() {
      const diff = Math.max(0, end - Date.now());
      setRemaining({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return remaining;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PortalDashboardClient({ data }: { data: PortalDashboardData }) {
  const countdown = useCountdown(data.periodEndDate);
  const weekOfMonth = Math.ceil(new Date().getDate() / 7);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {data.distributor.fullName.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">{data.periodLabel ?? "Sin periodo abierto"}</p>
      </div>

      {countdown && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock size={16} className="text-muted-foreground" /> Tiempo restante de la semana
          </div>
          <div className="flex gap-2">
            {[
              { v: countdown.d, l: "D" },
              { v: countdown.h, l: "H" },
              { v: countdown.m, l: "M" },
              { v: countdown.s, l: "S" },
            ].map((u) => (
              <div key={u.l} className="rounded-md border border-border bg-background px-2.5 py-1.5 text-center">
                <div className="text-sm font-bold tabular-nums">{String(u.v).padStart(2, "0")}</div>
                <div className="text-[9px] text-muted-foreground">{u.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Avance de rango */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Award size={16} className="text-primary" /> Avance de rango
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{data.currentRank}</span>
          {data.nextRank && <span className="text-muted-foreground">→ {data.nextRank}</span>}
        </div>
        {data.nextRank ? (
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Volumen personal</span>
                <span>{fmt(data.personalVolume)} / {fmt(data.nextRankPersonalReq)}</span>
              </div>
              <ProgressBar value={data.personalVolume} max={data.nextRankPersonalReq} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Volumen de equipo</span>
                <span>{fmt(data.teamVolume)} / {fmt(data.nextRankTeamReq)}</span>
              </div>
              <ProgressBar value={data.teamVolume} max={data.nextRankTeamReq} />
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Ya estás en el rango más alto del plan.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Contador semanal */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp size={16} className="text-primary" /> Volumen de la semana
          </div>
          {data.binaryEnabled ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Pierna izquierda</p>
                <p className="mt-1 text-lg font-semibold">{fmt(data.leftVolume)}</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">Pierna derecha</p>
                <p className="mt-1 text-lg font-semibold">{fmt(data.rightVolume)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Volumen de equipo</p>
              <p className="mt-1 text-lg font-semibold">{fmt(data.teamVolume)}</p>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Volumen personal: <strong className="text-foreground">{fmt(data.personalVolume)}</strong></span>
            <span>Semana {weekOfMonth} del mes</span>
          </div>
        </div>

        {/* Snapshot del negocio */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users2 size={16} className="text-primary" /> Resumen de tu negocio
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="py-1.5 text-muted-foreground">Equipo total</td>
                <td className="py-1.5 text-right font-medium">{data.downlineTotal}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-1.5 text-muted-foreground">Activos</td>
                <td className="py-1.5 text-right font-medium">{data.downlineActive}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-1.5 text-muted-foreground">Inactivos</td>
                <td className="py-1.5 text-right font-medium">{data.downlineTotal - data.downlineActive}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-muted-foreground">Patrocinados directos</td>
                <td className="py-1.5 text-right font-medium">{data.directCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
