"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Invoice } from "@/modules/finance/repository";

const statusColor: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  OVERDUE: "bg-red-500/10 text-red-600 dark:text-red-400",
};
const statusLabel: Record<string, string> = { PAID: "Pagada", PENDING: "Pendiente", OVERDUE: "Vencida" };

export function FinanceClient({ invoices, isDemo }: { invoices: Invoice[]; isDemo: boolean }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const total = invoices.reduce((sum, i) => sum + i.amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/finance/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName, amount: Number(amount), dueDate }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo crear la factura");
      return;
    }
    setClientName("");
    setAmount("");
    setDueDate("");
    setShowForm(false);
    router.refresh();
  }

  async function markPaid(id: string) {
    await fetch(`/api/finance/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
          <p className="text-sm text-muted-foreground">
            Total facturado: ${total.toLocaleString("es-MX")} {isDemo && "· datos de ejemplo"}
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus size={15} /> Nueva factura
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cliente</label>
            <input
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Monto</label>
            <input
              type="number"
              min={0}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Vence</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear"}
          </button>
          {error && <p className="w-full text-xs text-red-500">{error}</p>}
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Vence</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{inv.clientName}</td>
                <td className="px-4 py-3">${inv.amount.toLocaleString("es-MX")}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[inv.status]}`}>
                    {statusLabel[inv.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{inv.dueDate}</td>
                <td className="px-4 py-3 text-right">
                  {inv.status !== "PAID" && !isDemo && (
                    <button onClick={() => markPaid(inv.id)} className="text-xs font-medium text-primary hover:underline">
                      Marcar pagada
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
