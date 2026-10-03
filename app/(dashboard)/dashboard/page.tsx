import { Users2, Wallet, KanbanSquare, TrendingUp } from "lucide-react";

const kpis = [
  { label: "Clientes activos", value: "1,284", delta: "+8.2%", icon: Users2 },
  { label: "Ingresos del mes", value: "$482,300", delta: "+12.4%", icon: Wallet },
  { label: "Proyectos abiertos", value: "37", delta: "-2.1%", icon: KanbanSquare },
  { label: "Tasa de cierre", value: "24.6%", delta: "+3.0%", icon: TrendingUp },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Vista general del negocio — datos de ejemplo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
              <kpi.icon size={16} className="text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{kpi.value}</div>
            <div
              className={
                kpi.delta.startsWith("-")
                  ? "mt-1 text-xs text-red-500"
                  : "mt-1 text-xs text-emerald-500"
              }
            >
              {kpi.delta} vs. mes anterior
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium">Módulos activos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Este tenant tiene activos: Core, CRM, Proyectos, Finanzas, Soporte y
          Analítica. Prueba <kbd className="rounded border border-border bg-muted px-1">⌘K</kbd> para
          navegar entre ellos.
        </p>
      </div>
    </div>
  );
}
