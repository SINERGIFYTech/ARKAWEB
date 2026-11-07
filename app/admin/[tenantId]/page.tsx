import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTenantUsageDetail, getTenantModules } from "@/modules/platform/admin-repository";
import { TenantModulesToggle } from "@/modules/platform/tenant-modules-toggle";

export const dynamic = "force-dynamic";

const fmtMXN = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fmtUSD = (n: number) => `$${n.toLocaleString("en-US")} USD`;

const eventLabels: Record<string, string> = {
  DISTRIBUTOR_REGISTERED: "Registro de distribuidor",
  ORDER_PROCESSED: "Orden de compra/venta procesada",
  COMMISSION_RUN: "Cierre de periodo (comisiones)",
  GENEALOGY_QUERY: "Consulta pesada del árbol genealógico",
};

export default async function AdminTenantDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant, periodLabel, billing, byType } = await getTenantUsageDetail(tenantId);
  const tenantModules = await getTenantModules(tenantId);

  if (!tenant) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={13} /> Todos los clientes
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tenant.name}</h1>
        <p className="text-sm text-muted-foreground">Periodo: {periodLabel} · estado: {tenant.status}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Interacciones del mes</p>
          <p className="mt-1 text-2xl font-semibold">{billing.totalInteractions.toLocaleString("es-MX")}</p>
          <p className="text-xs text-muted-foreground">de {billing.includedInteractions.toLocaleString("es-MX")} incluidas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Renta base</p>
          <p className="mt-1 text-2xl font-semibold">{fmtMXN(billing.baseFeeMXN)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Excedente</p>
          <p className="mt-1 text-2xl font-semibold">
            {billing.overageBlocks > 0 ? fmtUSD(billing.overageCostUSD) : "—"}
          </p>
          {billing.overageBlocks > 0 && (
            <p className="text-xs text-muted-foreground">
              {billing.overageBlocks} bloque(s) · {billing.overageInteractions.toLocaleString("es-MX")} interacciones de más
            </p>
          )}
        </div>
      </div>

      <TenantModulesToggle tenantId={tenantId} modules={tenantModules} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Tipo de interacción</th>
              <th className="px-4 py-3 font-medium">Cantidad este mes</th>
            </tr>
          </thead>
          <tbody>
            {byType.map((row) => (
              <tr key={row.eventType} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{eventLabels[row.eventType] ?? row.eventType}</td>
                <td className="px-4 py-3 font-medium">{row.quantity.toLocaleString("es-MX")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


    </div>
  );
}
