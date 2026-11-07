import { getCurrentDistributor } from "@/lib/distributor-auth";
import { getPortalEarnings } from "@/modules/portal/repository";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export default async function PortalEarningsPage() {
  const distributor = await getCurrentDistributor();
  if (!distributor) return null;

  const { rows, lifetimeTotal } = await getPortalEarnings(distributor);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ganancias</h1>
        <p className="text-sm text-muted-foreground">Total histórico: {fmt(lifetimeTotal)}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Periodo</th>
              <th className="px-4 py-3 font-medium">Rango</th>
              <th className="px-4 py-3 font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.periodLabel}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.rank}</td>
                <td className="px-4 py-3 font-semibold">{fmt(r.totalAmount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">Sin cortes pagados todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
