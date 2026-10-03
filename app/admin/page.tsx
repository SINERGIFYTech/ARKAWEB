import Link from "next/link";
import { listTenantsWithUsage } from "@/modules/platform/admin-repository";
import { BILLING_CONFIG } from "@/modules/platform/billing";

// Depende de sesión/DB en tiempo real — nunca se debe pre-renderizar en build.
export const dynamic = "force-dynamic";

const fmtMXN = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fmtUSD = (n: number) => `$${n.toLocaleString("en-US")} USD`;

export default async function AdminClientsPage() {
  const { periodLabel, tenants } = await listTenantsWithUsage();

  const totalMXN = tenants.reduce((sum, t) => sum + t.billing.baseFeeMXN, 0);
  const totalUSD = tenants.reduce((sum, t) => sum + t.billing.overageCostUSD, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Periodo: {periodLabel} · renta base {fmtMXN(BILLING_CONFIG.baseFeeMXN)} incluye{" "}
          {BILLING_CONFIG.includedInteractions.toLocaleString("es-MX")} interacciones · excedente{" "}
          {fmtUSD(BILLING_CONFIG.overageBlockPriceUSD)} por bloque de {BILLING_CONFIG.overageBlockSize.toLocaleString("es-MX")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Clientes activos</p>
          <p className="mt-1 text-2xl font-semibold">{tenants.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Renta base total del mes</p>
          <p className="mt-1 text-2xl font-semibold">{fmtMXN(totalMXN)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Excedente total del mes</p>
          <p className="mt-1 text-2xl font-semibold">{fmtUSD(totalUSD)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Interacciones</th>
              <th className="px-4 py-3 font-medium">Excedente</th>
              <th className="px-4 py-3 font-medium">Renta base</th>
              <th className="px-4 py-3 font-medium">Cargo excedente</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.tenantId} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/${t.tenantId}`} className="hover:underline">
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.status}</td>
                <td className="px-4 py-3">
                  {t.billing.totalInteractions.toLocaleString("es-MX")} / {t.billing.includedInteractions.toLocaleString("es-MX")}
                </td>
                <td className="px-4 py-3">
                  {t.billing.overageBlocks > 0 ? (
                    <span className="text-amber-600">{t.billing.overageBlocks} bloque(s)</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">{fmtMXN(t.billing.baseFeeMXN)}</td>
                <td className="px-4 py-3 font-semibold">
                  {t.billing.overageCostUSD > 0 ? fmtUSD(t.billing.overageCostUSD) : "—"}
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Aún no hay clientes registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
