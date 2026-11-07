"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, CheckCircle2 } from "lucide-react";
import type { PortalOrder } from "@/modules/store/portal-repository";

const money = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-muted text-muted-foreground",
};
const statusLabel: Record<string, string> = { PENDING: "Pendiente de pago", PAID: "Pagado", CANCELLED: "Cancelado" };

interface Product { id: string; sku: string; name: string; description: string | null; price: number }

export function PortalShopClient({ products, orders, paymentInstructions }: { products: Product[]; orders: PortalOrder[]; paymentInstructions: string }) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ number: number; totalPrice: number; paymentInstructions: string } | null>(null);

  const total = products.reduce((s, p) => s + (cart[p.id] ?? 0) * p.price, 0);
  const count = Object.values(cart).reduce((s, q) => s + q, 0);
  const setQty = (id: string, q: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(99, q)) }));

  async function placeOrder() {
    setError(null);
    setBusy(true);
    const items = Object.entries(cart).filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity }));
    const res = await fetch("/api/portal/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "No se pudo hacer el pedido");
    setPlaced(body);
    setCart({});
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight">Tienda</h1>
        <p className="text-sm text-muted-foreground">Haz tu pedido y paga según las instrucciones; la empresa confirmará tu pago.</p>
      </div>

      {placed && (
        <div className="card-elevated space-y-2 p-5">
          <p className="flex items-center gap-2 font-semibold text-emerald-600"><CheckCircle2 size={18} /> Pedido #{placed.number} registrado por {money(placed.totalPrice)}</p>
          {placed.paymentInstructions ? (
            <div className="rounded-lg bg-accent p-4 text-sm"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">Cómo pagar</p><p className="whitespace-pre-wrap">{placed.paymentInstructions}</p></div>
          ) : (
            <p className="text-sm text-muted-foreground">Comunícate con la empresa para coordinar tu pago.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p, i) => {
          const q = cart[p.id] ?? 0;
          return (
            <div key={p.id} className="card-elevated animate-fade-up flex flex-col justify-between p-4" style={{ animationDelay: `${i * 40}ms` }}>
              <div>
                <p className="font-semibold">{p.name}</p>
                {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-bold">{money(p.price)}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(p.id, q - 1)} disabled={q === 0} className="rounded-md border border-border p-1.5 hover:bg-muted disabled:opacity-40"><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{q}</span>
                  <button onClick={() => setQty(p.id, q + 1)} className="rounded-md bg-primary p-1.5 text-primary-foreground hover:opacity-90"><Plus size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {products.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Todavía no hay productos disponibles.</p>}
      </div>

      {count > 0 && (
        <div className="surface-dark sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 shadow-xl">
          <span className="flex items-center gap-2 text-sm"><ShoppingCart size={16} /> {count} artículo(s) · <strong>{money(total)}</strong></span>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-300">{error}</span>}
            <button onClick={placeOrder} disabled={busy} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60">{busy ? "Enviando…" : "Hacer pedido"}</button>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Mis pedidos</h2>
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="card-elevated flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Pedido #{o.number} · {money(o.totalPrice)}</p>
                <p className="truncate text-xs text-muted-foreground">{o.summary}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[o.status]}`}>{statusLabel[o.status]}</span>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-muted-foreground">Aún no has hecho pedidos.</p>}
        </div>
      </div>
    </div>
  );
}
