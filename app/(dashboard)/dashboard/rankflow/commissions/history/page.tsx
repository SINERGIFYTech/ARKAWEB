import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCommissionHistory } from "@/modules/rankflow/repository";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export default async function CommissionHistoryPage() {
  const periods = await getCommissionHistory();

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/rankflow/commissions"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={13} /> Volver a Comisiones
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Historial de cortes</h1>
        <p className="text-sm text-muted-foreground">Periodos cerrados — montos ya congelados, no se recalculan.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Periodo</th>
              <th className="px-4 py-3 font-medium">Cerrado</th>
              <th className="px-4 py-3 font-medium">Distribuidores pagados</th>
              <th className="px-4 py-3 font-medium">Total pagado</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/dashboard/rankflow/commissions/history/${p.id}`} className="hover:underline">
                    {p.label}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.closedAt ? new Date(p.closedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="px-4 py-3">{p.distributorsPaid}</td>
                <td className="px-4 py-3 font-semibold">{fmt(p.totalPaid)}</td>
              </tr>
            ))}
            {periods.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Aún no se ha cerrado ningún periodo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
