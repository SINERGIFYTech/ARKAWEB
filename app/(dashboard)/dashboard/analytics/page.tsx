const rows = [
  { module: "CRM", metric: "Leads nuevos", value: "142", trend: "+9%" },
  { module: "Finanzas", metric: "Ingresos", value: "$482,300", trend: "+12%" },
  { module: "Proyectos", metric: "Tareas completadas", value: "58", trend: "+4%" },
  { module: "Soporte", metric: "Tiempo resp. promedio", value: "3.2h", trend: "-15%" },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analítica</h1>
        <p className="text-sm text-muted-foreground">Resumen ejecutivo por módulo</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Módulo</th>
              <th className="px-4 py-3 font-medium">Métrica</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Tendencia</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.metric} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{r.module}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.metric}</td>
                <td className="px-4 py-3">{r.value}</td>
                <td className={`px-4 py-3 ${r.trend.startsWith("-") ? "text-red-500" : "text-emerald-500"}`}>
                  {r.trend}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
