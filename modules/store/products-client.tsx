"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check, X } from "lucide-react";
import type { ProductRow } from "@/modules/store/repository";

const money = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) return null;
  return (await res.json().catch(() => ({}))).error ?? "No se pudo guardar";
}

function ProductRowView({ p, disabled }: { p: ProductRow; disabled: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const [price, setPrice] = useState(String(p.price));
  const [cv, setCv] = useState(String(p.cv));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const err = await send(`/api/store/products/${p.id}`, "PATCH", { name, price: Number(price), cv: Number(cv) });
    if (err) return setError(err);
    setEditing(false);
    router.refresh();
  }
  async function toggleActive() {
    const err = await send(`/api/store/products/${p.id}`, "PATCH", { isActive: !p.isActive });
    if (err) setError(err);
    else router.refresh();
  }

  return (
    <tr className={`border-b border-border last:border-0 ${p.isActive ? "" : "opacity-50"}`}>
      <td className="px-4 py-3">
        {editing ? (
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
        ) : (
          <>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.sku}</p>
          </>
        )}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </td>
      <td className="px-4 py-3">{editing ? <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={`${input} w-28`} /> : money(p.price)}</td>
      <td className="px-4 py-3 font-semibold text-primary">{editing ? <input type="number" min={0} step="0.01" value={cv} onChange={(e) => setCv(e.target.value)} className={`${input} w-28`} /> : money(p.cv)}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{p.isEnrollmentPackage ? "Paquete de inscripción" : "Producto"}</td>
      <td className="px-4 py-3 text-right">
        {disabled ? null : editing ? (
          <span className="flex justify-end gap-1">
            <button onClick={save} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-500/10"><Check size={15} /></button>
            <button onClick={() => setEditing(false)} className="rounded p-1.5 text-muted-foreground hover:bg-muted"><X size={15} /></button>
          </span>
        ) : (
          <span className="flex items-center justify-end gap-2">
            <button onClick={toggleActive} className="text-xs font-medium text-muted-foreground hover:text-foreground">{p.isActive ? "Desactivar" : "Activar"}</button>
            <button onClick={() => setEditing(true)} className="rounded p-1.5 text-muted-foreground hover:bg-muted"><Pencil size={14} /></button>
          </span>
        )}
      </td>
    </tr>
  );
}

export function ProductsClient({ products, paymentInstructions, isDemo }: { products: ProductRow[]; paymentInstructions: string; isDemo: boolean }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [cv, setCv] = useState("");
  const [isPackage, setIsPackage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState(paymentInstructions);
  const [instrMsg, setInstrMsg] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = await send("/api/store/products", "POST", { sku, name, description, price: Number(price), cv: Number(cv), isEnrollmentPackage: isPackage });
    if (err) return setError(err);
    setSku(""); setName(""); setDescription(""); setPrice(""); setCv(""); setIsPackage(false); setShow(false);
    router.refresh();
  }

  async function saveInstructions() {
    setInstrMsg(null);
    const err = await send("/api/store/settings", "PUT", { paymentInstructions: instructions });
    setInstrMsg(err ?? "Guardado");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos y paquetes</h1>
          <p className="text-sm text-muted-foreground">
            El <strong>CV</strong> (valor comisionable) es lo que genera las comisiones: un pedido pagado produce volumen = cantidad × CV.
            Cambiar el CV solo afecta pedidos futuros. {isDemo && "· modo demo"}
          </p>
        </div>
        {!isDemo && (
          <button onClick={() => setShow((s) => !s)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus size={15} /> Nuevo
          </button>
        )}
      </div>

      {show && (
        <form onSubmit={create} className="card-elevated space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><label className="text-xs font-medium text-muted-foreground">SKU</label><input required value={sku} onChange={(e) => setSku(e.target.value)} className={`mt-1 ${input}`} /></div>
            <div className="sm:col-span-3"><label className="text-xs font-medium text-muted-foreground">Nombre</label><input required value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${input}`} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Precio</label><input required type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={`mt-1 ${input}`} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">CV (valor comisionable)</label><input required type="number" min={0} step="0.01" value={cv} onChange={(e) => setCv(e.target.value)} className={`mt-1 ${input}`} /></div>
            <div className="sm:col-span-2"><label className="text-xs font-medium text-muted-foreground">Descripción (opcional)</label><input value={description} onChange={(e) => setDescription(e.target.value)} className={`mt-1 ${input}`} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPackage} onChange={(e) => setIsPackage(e.target.checked)} /> Es un paquete de inscripción (se ofrece al registrarse con un link)</label>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Crear</button>
        </form>
      )}

      <div className="card-elevated overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Producto</th><th className="px-4 py-3 font-medium">Precio</th><th className="px-4 py-3 font-medium">CV</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => <ProductRowView key={p.id} p={p} disabled={isDemo} />)}
            {products.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aún no hay productos. Crea al menos un paquete de inscripción para poder recibir registros.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card-elevated space-y-2 p-5">
        <h2 className="text-sm font-semibold">Instrucciones de pago</h2>
        <p className="text-xs text-muted-foreground">Todavía no hay un procesador de pagos conectado: se cobra por fuera (transferencia, depósito…) y tú confirmas el pago. Este texto se le muestra al distribuidor al hacer su pedido o registrarse.</p>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} disabled={isDemo} placeholder="Ej. Transfiere a la cuenta CLABE … a nombre de … y envía tu comprobante por WhatsApp al …" className={input} />
        <div className="flex items-center gap-3">
          <button onClick={saveInstructions} disabled={isDemo} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">Guardar</button>
          {instrMsg && <span className="text-xs text-muted-foreground">{instrMsg}</span>}
        </div>
      </div>
    </div>
  );
}
