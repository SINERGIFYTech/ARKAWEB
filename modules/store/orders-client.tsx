"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { OrderRow, ProductRow } from "@/modules/store/repository";

const money = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-muted text-muted-foreground",
};
const statusLabel: Record<string, string> = { PENDING: "Pendiente de pago", PAID: "Pagado", CANCELLED: "Cancelado" };
const sourceLabel: Record<string, string> = { ADMIN: "Equipo", PORTAL: "Portal", ENROLLMENT: "Inscripción" };

interface DistOption { id: string; fullName: string; code: string }
interface Line { productId: string; quantity: number }

export function OrdersClient({ orders, products, distributors, isDemo }: { orders: OrderRow[]; products: ProductRow[]; distributors: DistOption[]; isDemo: boolean }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState("");
  const [distributorId, setDistributorId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: 1 }]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [note, setNote] = useState("");
  const [markPaid, setMarkPaid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const activeProducts = products.filter((p) => p.isActive);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return distributors.filter((d) => !q || d.fullName.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)).slice(0, 50);
  }, [distributors, search]);

  const totalPrice = lines.reduce((s, l) => s + (byId.get(l.productId)?.price ?? 0) * l.quantity, 0);
  const totalCv = lines.reduce((s, l) => s + (byId.get(l.productId)?.cv ?? 0) * l.quantity, 0);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!distributorId) return setError("Elige un distribuidor.");
    const items = lines.filter((l) => l.productId);
    if (items.length === 0) return setError("Agrega al menos un producto.");
    setBusy(true);
    const res = await fetch("/api/store/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distributorId, items, paymentMethod, note, markPaid }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "No se pudo crear el pedido");
    setShow(false); setDistributorId(""); setLines([{ productId: "", quantity: 1 }]); setNote(""); setPaymentMethod("");
    router.refresh();
  }

  async function action(id: string, kind: "pay" | "cancel") {
    setRowError(null);
    const res = await fetch(`/api/store/orders/${id}/${kind}`, { method: "POST" });
    if (!res.ok) return setRowError((await res.json().catch(() => ({}))).error ?? "No se pudo completar");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Al marcar un pedido como pagado, su CV se convierte en volumen del periodo abierto. {isDemo && "· modo demo"}</p>
        </div>
        {!isDemo && (
          <button onClick={() => setShow((s) => !s)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus size={15} /> Nuevo pedido
          </button>
        )}
      </div>

      {show && (
        <form onSubmit={create} className="card-elevated space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Distribuidor (busca por nombre o código)</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className={`mt-1 ${input}`} />
              <select value={distributorId} onChange={(e) => setDistributorId(e.target.value)} size={Math.min(5, Math.max(2, matches.length))} className={`mt-2 ${input}`}>
                {matches.map((d) => <option key={d.id} value={d.id}>{d.fullName} ({d.code})</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Forma de pago</label><input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Transferencia, efectivo…" className={`mt-1 ${input}`} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Nota</label><input value={note} onChange={(e) => setNote(e.target.value)} className={`mt-1 ${input}`} /></div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Productos</label>
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={l.productId} onChange={(e) => setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, productId: e.target.value } : x)))} className={input}>
                  <option value="">Selecciona…</option>
                  {activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.price)} · CV {money(p.cv)}</option>)}
                </select>
                <input type="number" min={1} max={1000} value={l.quantity} onChange={(e) => setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, quantity: Number(e.target.value) } : x)))} className={`${input} w-24`} />
                {lines.length > 1 && <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="rounded p-1.5 text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></button>}
              </div>
            ))}
            <button type="button" onClick={() => setLines((ls) => [...ls, { productId: "", quantity: 1 }])} className="text-xs font-medium text-primary hover:underline">+ Agregar producto</button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-accent px-4 py-3 text-sm">
            <span>Total: <strong>{money(totalPrice)}</strong> · CV (volumen): <strong className="text-primary">{money(totalCv)}</strong></span>
            <label className="flex items-center gap-2"><input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} /> Marcar como pagado ahora</label>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">{busy ? "Guardando…" : "Crear pedido"}</button>
        </form>
      )}

      {rowError && <p className="text-xs text-red-500">{rowError}</p>}
      <div className="card-elevated overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">#</th><th className="px-4 py-3 font-medium">Distribuidor</th><th className="px-4 py-3 font-medium">Origen</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">CV</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{o.number}</td>
                <td className="px-4 py-3">{o.distributorName} <span className="text-xs text-muted-foreground">{o.distributorCode}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{sourceLabel[o.source]}</td>
                <td className="px-4 py-3">{money(o.totalPrice)}</td>
                <td className="px-4 py-3 font-semibold text-primary">{money(o.totalCv)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[o.status]}`}>{statusLabel[o.status]}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</td>
                <td className="px-4 py-3 text-right">
                  {o.status === "PENDING" && !isDemo && (
                    <span className="flex justify-end gap-3">
                      <button onClick={() => action(o.id, "pay")} className="text-xs font-semibold text-emerald-600 hover:underline">Marcar pagado</button>
                      <button onClick={() => action(o.id, "cancel")} className="text-xs text-muted-foreground hover:text-red-500">Cancelar</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Sin pedidos todavía.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
