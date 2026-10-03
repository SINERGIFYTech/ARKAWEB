"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Users2, TrendingUp, Wallet, UserCheck } from "lucide-react";
import type { AnalyticsData } from "@/modules/analytics/repository";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

const PALETTE = ["#94a3b8", "#f59e0b", "#64748b", "#ef4444", "#10b981", "#06b6d4", "#8b5cf6", "#3b82f6"];

function KpiCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="h-64 w-full">{children}</div>
    </div>
  );
}

export function AnalyticsClient({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analítica</h1>
        <p className="text-sm text-muted-foreground">
          Resumen ejecutivo de RankFlow {data.isDemo && "· datos de ejemplo, conecta Supabase para datos reales"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Distribuidores" value={data.totalDistributors.toString()} icon={Users2} />
        <KpiCard label="Activos" value={data.activeDistributors.toString()} icon={UserCheck} />
        <KpiCard label="Volumen periodo abierto" value={fmt(data.openPeriodVolume)} icon={TrendingUp} />
        <KpiCard label="Pagado histórico" value={fmt(data.lifetimePaid)} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Volumen capturado por periodo">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.volumeByPeriod}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Line type="monotone" dataKey="volumen" stroke="#6d5ef8" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Comisiones pagadas por corte">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.commissionsByPeriod}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="comisiones" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribución por rango">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.rankDistribution} dataKey="cantidad" nameKey="rank" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {data.rankDistribution.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top distribuidores por volumen (periodo abierto)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topDistributors} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="volumen" fill="#6d5ef8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
