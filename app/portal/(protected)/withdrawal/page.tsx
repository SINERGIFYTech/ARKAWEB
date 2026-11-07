import { getCurrentDistributor } from "@/lib/distributor-auth";
import { getPortalEarnings } from "@/modules/portal/repository";
import { Download } from "lucide-react";

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export default async function PortalWithdrawalPage() {
  const distributor = await getCurrentDistributor();
  if (!distributor) return null;

  const { lifetimeTotal } = await getPortalEarnings(distributor);

  return (
    <div className="max-w-md space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Retiros</h1>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">Total ganado histórico</p>
        <p className="mt-1 text-3xl font-semibold">{fmt(lifetimeTotal)}</p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
        <Download size={24} className="text-muted-foreground" />
        <p className="text-sm font-medium">Retiro de fondos próximamente</p>
        <p className="text-xs text-muted-foreground">
          Todavía no hay un procesador de pagos conectado para enviar retiros reales. Esto se agrega cuando la
          compañía defina cómo quiere pagar (transferencia, tarjeta, etc).
        </p>
      </div>
    </div>
  );
}
