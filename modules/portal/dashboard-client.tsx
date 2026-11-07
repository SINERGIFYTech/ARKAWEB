"use client";

import { useEffect, useState } from "react";
import { Clock, TrendingUp, Users2, Award, UserCheck, UserX, Network, Sparkles, Link2, Copy, Check } from "lucide-react";
import type { PortalDashboardData } from "@/modules/portal/repository";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

function useCountdown(endDate: string | null) {
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!endDate) return;
    const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
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
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all duration-700 ${pct > 0 ? "progress-shimmer" : ""}`}
        style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="surface-gradient flex items-center gap-3 rounded-t-xl px-5 py-3.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {subtitle && <p className="text-[11px] leading-tight text-white/75">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" | "info" }) {
  const toneClass = {
    primary: "from-violet-500/15 to-fuchsia-500/10 text-violet-700 dark:text-violet-300",
    success: "from-emerald-500/15 to-teal-500/10 text-emerald-700 dark:text-emerald-300",
    info: "from-sky-500/15 to-indigo-500/10 text-sky-700 dark:text-sky-300",
  }[tone];

  return (
    <div className={`rounded-xl bg-gradient-to-br ${toneClass} p-4 text-center`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function SnapshotRow({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={15} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-base font-bold tabular-nums">{value}</span>
    </div>
  );
}

function ReferralCard({ slug, code, binaryEnabled }: { slug: string; code: string; binaryEnabled: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!slug) return null;
  const base = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${encodeURIComponent(slug)}/${encodeURIComponent(code)}`;
  const links = binaryEnabled
    ? [{ label: "Pierna izquierda", url: `${base}?leg=left` }, { label: "Pierna derecha", url: `${base}?leg=right` }]
    : [{ label: "Tu link", url: base }];

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="card-elevated animate-fade-up overflow-hidden" style={{ animationDelay: "90ms" }}>
      <SectionHeader icon={Link2} title="Tu link de registro" subtitle="Compártelo y quien se registre queda en tu equipo" />
      <div className="space-y-2.5 p-5">
        {links.map((l) => (
          <div key={l.url} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{l.label}</p>
              <p className="truncate text-sm">{l.url}</p>
            </div>
            <button onClick={() => copy(l.url)} className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              {copied === l.url ? <Check size={13} /> : <Copy size={13} />} {copied === l.url ? "Copiado" : "Copiar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortalDashboardClient({ data, referral }: { data: PortalDashboardData; referral: { slug: string; code: string } }) {
  const countdown = useCountdown(data.periodEndDate);
  const weekOfMonth = Math.ceil(new Date().getDate() / 7);
  const progressPct =
    data.nextRank && data.nextRankPersonalReq + data.nextRankTeamReq > 0
      ? Math.min(
          100,
          ((Math.min(data.personalVolume, data.nextRankPersonalReq) + Math.min(data.teamVolume, data.nextRankTeamReq)) /
            (data.nextRankPersonalReq + data.nextRankTeamReq)) *
            100
        )
      : 0;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight">Hola, {data.distributor.fullName.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">{data.periodLabel ?? "Sin periodo abierto"}</p>
      </div>

      {countdown && (
        <div className="surface-dark animate-fade-up overflow-hidden rounded-2xl p-6 shadow-lg" style={{ animationDelay: "60ms" }}>
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/25 bg-white/10 backdrop-blur">
                <Clock size={26} className="animate-soft-pulse" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">Tiempo restante</p>
                <p className="text-xl font-semibold leading-tight">Antes de que cierre la semana</p>
              </div>
            </div>
            <div className="flex gap-3">
              {[
                { v: countdown.d, l: "Días" },
                { v: countdown.h, l: "Horas" },
                { v: countdown.m, l: "Min" },
                { v: countdown.s, l: "Seg" },
              ].map((u) => (
                <div
                  key={u.l}
                  className="min-w-[64px] rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-center backdrop-blur"
                >
                  <div className="text-2xl font-bold tabular-nums">{String(u.v).padStart(2, "0")}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/60">{u.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ReferralCard slug={referral.slug} code={referral.code} binaryEnabled={data.binaryEnabled} />

      <div className="card-elevated animate-fade-up overflow-hidden" style={{ animationDelay: "120ms" }}>
        <SectionHeader icon={Award} title="Avance de rango" subtitle="Tu camino al siguiente nivel" />
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="stat-glow flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Award size={22} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rango actual</p>
                <p className="text-lg font-bold">{data.currentRank}</p>
              </div>
            </div>
            {data.nextRank && (
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Siguiente</p>
                <p className="flex items-center justify-end gap-1.5 text-lg font-bold text-primary">
                  <Sparkles size={16} /> {data.nextRank}
                </p>
              </div>
            )}
          </div>

          {data.nextRank ? (
            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Progreso general</span>
                  <span className="font-bold text-primary">{progressPct.toFixed(0)}%</span>
                </div>
                <ProgressBar value={progressPct} max={100} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 p-3.5">
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>Volumen personal</span>
                    <span className="font-semibold text-foreground">
                      {fmt(data.personalVolume)} / {fmt(data.nextRankPersonalReq)}
                    </span>
                  </div>
                  <ProgressBar value={data.personalVolume} max={data.nextRankPersonalReq} />
                </div>
                <div className="rounded-xl border border-border/60 p-3.5">
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>Volumen de equipo</span>
                    <span className="font-semibold text-foreground">
                      {fmt(data.teamVolume)} / {fmt(data.nextRankTeamReq)}
                    </span>
                  </div>
                  <ProgressBar value={data.teamVolume} max={data.nextRankTeamReq} />
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-foreground">
              🏆 Ya estás en el rango más alto del plan.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card-elevated animate-fade-up overflow-hidden" style={{ animationDelay: "180ms" }}>
          <SectionHeader icon={TrendingUp} title="Volumen de la semana" subtitle="Registra • Crece • Alcanza" />
          <div className="space-y-4 p-5">
            {data.binaryEnabled ? (
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Pierna izquierda" value={fmt(data.leftVolume)} tone="primary" />
                <StatTile label="Pierna derecha" value={fmt(data.rightVolume)} tone="info" />
              </div>
            ) : (
              <StatTile label="Volumen de equipo" value={fmt(data.teamVolume)} tone="primary" />
            )}
            <StatTile label="Volumen personal" value={fmt(data.personalVolume)} tone="success" />
            <p className="text-center text-xs text-muted-foreground">
              Semana <strong className="text-foreground">{weekOfMonth}</strong> del mes
            </p>
          </div>
        </div>

        <div className="card-elevated animate-fade-up overflow-hidden" style={{ animationDelay: "240ms" }}>
          <SectionHeader icon={Users2} title="Resumen de tu negocio" subtitle="Tu equipo de un vistazo" />
          <div className="space-y-2.5 p-5">
            <SnapshotRow icon={Network} label="Equipo total" value={data.downlineTotal} tone="bg-violet-500/15 text-violet-600 dark:text-violet-300" />
            <SnapshotRow icon={UserCheck} label="Activos" value={data.downlineActive} tone="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" />
            <SnapshotRow icon={UserX} label="Inactivos" value={data.downlineTotal - data.downlineActive} tone="bg-rose-500/15 text-rose-600 dark:text-rose-300" />
            <SnapshotRow icon={Users2} label="Patrocinados directos" value={data.directCount} tone="bg-sky-500/15 text-sky-600 dark:text-sky-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
