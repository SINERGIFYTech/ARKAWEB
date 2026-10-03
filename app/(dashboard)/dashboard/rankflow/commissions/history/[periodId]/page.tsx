import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCommissionRunDetail } from "@/modules/rankflow/repository";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export default async function CommissionRunDetailPage({ params }: { params: Promise<{ periodId: string }> }) {
  const { periodId } = await params;
  const { label, runs } = await getCommissionRunDetail(periodId);
  const total = runs.reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/rankflow/commissions/history"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={13} /> Historial de cortes
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{label || "Corte"}</h1>
        <p className="text-sm text-muted-foreground">
          {runs.length} distribuidor(es) pagados · total {fmt(total)} — congelado, no se recalcula
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Distribuidor</th>
              <th className="px-4 py-3 font-medium">Rango</th>
              <th className="px-4 py-3 font-medium">Binario</th>
              <th className="px-4 py-3 font-medium">Unilevel</th>
              <th className="px-4 py-3 font-medium">Generacional</th>
              <th className="px-4 py-3 font-medium">Bono rango</th>
              <th className="px-4 py-3 font-medium">Matching</th>
              <th className="px-4 py-3 font-medium">Inicio rápido</th>
              <th className="px-4 py-3 font-medium">Global</th>
              <th className="px-4 py-3 font-medium">Calificación</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.distributorId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.distributorName}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.rank}</td>
                <td className="px-4 py-3">{fmt(r.binaryAmount)}</td>
                <td className="px-4 py-3">{fmt(r.unilevelAmount)}</td>
                <td className="px-4 py-3">{fmt(r.generationAmount)}</td>
                <td className="px-4 py-3">{fmt(r.rankBonusAmount)}</td>
                <td className="px-4 py-3">{fmt(r.matchingBonusAmount)}</td>
                <td className="px-4 py-3">{fmt(r.fastStartAmount)}</td>
                <td className="px-4 py-3">{fmt(r.globalBonusAmount)}</td>
                <td className="px-4 py-3">{fmt(r.qualificationBonusAmount)}</td>
                <td className="px-4 py-3 font-semibold">{fmt(r.totalAmount)}</td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">Sin registros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
