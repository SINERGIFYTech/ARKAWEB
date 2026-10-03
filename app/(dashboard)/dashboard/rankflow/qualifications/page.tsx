import { getQualificationStatus } from "@/modules/rankflow/repository";
import { getCompensationPlan } from "@/modules/rankflow/repository";
import { CheckCircle2, Circle } from "lucide-react";

export default async function QualificationsPage() {
  const [status, { config }] = await Promise.all([getQualificationStatus(), getCompensationPlan()]);

  if (config.qualificationBonuses.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">Calificaciones</h1>
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No hay bonos de calificación sostenida configurados (auto por rango, viaje por rango, etc). Agrégalos en
          Plan de compensación.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calificaciones</h1>
        <p className="text-sm text-muted-foreground">Rachas de calificación sostenida — auto, viaje y similares.</p>
      </div>

      {config.qualificationBonuses.map((rule) => {
        const rows = status.filter((s) => s.ruleId === rule.id);
        return (
          <div key={rule.id}>
            <h2 className="mb-2 text-sm font-semibold">
              {rule.name}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {rule.minRank}+ durante {rule.consecutivePeriods} periodo(s) seguidos
                {rule.cashAmount > 0 ? ` · ${rule.cashAmount.toLocaleString("es-MX")} MXN` : " · solo calificación"}
              </span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Distribuidor</th>
                    <th className="px-4 py-2 font-medium">Racha actual</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.distributorId} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-medium">{r.distributorName}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {r.consecutiveCount} / {rule.consecutivePeriods}
                      </td>
                      <td className="px-4 py-2">
                        {r.isQualified ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={14} /> Calificado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Circle size={14} /> En progreso
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                        Aún no hay datos — se llena al cerrar el primer periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
