"use client";

import Link from "next/link";
import {
  Users2,
  UserCheck,
  TrendingUp,
  Wallet,
  Network,
  Coins,
  Award,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { AnalyticsData } from "@/modules/analytics/repository";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  delay,
}: {
  label: string;
  value: string;
  icon: any;
  tone: string;
  delay: number;
}) {
  return (
    <div className="card-elevated animate-fade-up p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

const shortcuts = [
  { href: "/dashboard/rankflow/genealogy", label: "Genealogía", desc: "Ver y hacer crecer la red", icon: Network },
  { href: "/dashboard/rankflow/volume", label: "Capturar volumen", desc: "Registrar ventas de la semana", icon: TrendingUp },
  { href: "/dashboard/rankflow/commissions", label: "Comisiones", desc: "Revisar y cerrar el periodo", icon: Coins },
  { href: "/dashboard/rankflow/ranks", label: "Rangos", desc: "Quién sube y quién baja", icon: Award },
];

export function DashboardHomeClient({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-6">
      <div className="surface-dark animate-fade-up overflow-hidden rounded-2xl p-7 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">
              <Zap size={12} className="animate-soft-pulse" /> En vivo
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Panel de control</h1>
            <p className="mt-1 text-sm text-white/70">
              {data.isDemo ? "Datos de ejemplo — conecta Supabase para ver tu operación real" : "El pulso de tu red en tiempo real"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-white/60">Volumen del periodo abierto</p>
            <p className="text-4xl font-bold tabular-nums">{fmt(data.openPeriodVolume)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Distribuidores" value={data.totalDistributors.toString()} icon={Users2} tone="bg-violet-500/15 text-violet-600 dark:text-violet-300" delay={60} />
        <KpiCard label="Activos" value={data.activeDistributors.toString()} icon={UserCheck} tone="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" delay={120} />
        <KpiCard label="Volumen del periodo" value={fmt(data.openPeriodVolume)} icon={TrendingUp} tone="bg-sky-500/15 text-sky-600 dark:text-sky-300" delay={180} />
        <KpiCard label="Pagado histórico" value={fmt(data.lifetimePaid)} icon={Wallet} tone="bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300" delay={240} />
      </div>

      <div className="card-elevated animate-fade-up overflow-hidden" style={{ animationDelay: "300ms" }}>
        <div className="surface-gradient flex items-center gap-3 px-5 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Volumen por periodo</p>
            <p className="text-[11px] leading-tight text-white/75">Últimas semanas</p>
          </div>
        </div>
        <div className="h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.volumeByPeriod}>
              <defs>
                <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Area type="monotone" dataKey="volumen" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#volGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Accesos rápidos</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              className="card-elevated animate-fade-up group flex items-center gap-3 p-4"
              style={{ animationDelay: `${360 + i * 60}ms` }}
            >
              <div className="surface-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <s.icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="truncate text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <ArrowUpRight size={16} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
