const invoices = [
  { id: "INV-1042", client: "Grupo Alfa", amount: 45000, status: "Pagada", date: "12 jul 2026" },
  { id: "INV-1043", client: "Nova Textiles", amount: 12000, status: "Pendiente", date: "15 jul 2026" },
  { id: "INV-1044", client: "Bright Clinics", amount: 78000, status: "Vencida", date: "01 jul 2026" },
  { id: "INV-1045", client: "Constructora Sur", amount: 152000, status: "Pagada", date: "20 jul 2026" },
];

const statusColor: Record<string, string> = {
  Pagada: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Pendiente: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Vencida: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function FinancePage() {
  const total = invoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
        <p className="text-sm text-muted-foreground">
          Total facturado: ${total.toLocaleString("es-MX")}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Factura</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{inv.id}</td>
                <td className="px-4 py-3 text-muted-foreground">{inv.client}</td>
                <td className="px-4 py-3">${inv.amount.toLocaleString("es-MX")}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[inv.status]}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{inv.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
