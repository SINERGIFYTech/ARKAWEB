"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

const money = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
const input = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

export function JoinForm({
  slug, code, leg, packages,
}: {
  slug: string; code: string; leg: "LEFT" | "RIGHT" | null;
  packages: Array<{ id: string; name: string; description: string | null; price: number }>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [productId, setProductId] = useState(packages[0]?.id ?? "");
  const [website, setWebsite] = useState(""); // campo trampa anti-bots
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ paymentInstructions: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, code, leg, fullName, email, phone, productId, website }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "No se pudo completar el registro.");
    setDone({ paymentInstructions: body.paymentInstructions ?? "" });
  }

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
        <h2 className="text-lg font-semibold">¡Solicitud recibida!</h2>
        <p className="text-sm text-muted-foreground">En cuanto se confirme tu pago te llegará un correo con el acceso a tu portal.</p>
        {done.paymentInstructions && (
          <div className="rounded-lg bg-accent p-4 text-left text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">Cómo pagar</p>
            <p className="whitespace-pre-wrap">{done.paymentInstructions}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><label className="text-xs font-medium text-muted-foreground">Nombre completo</label><input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} /></div>
      <div><label className="text-xs font-medium text-muted-foreground">Correo</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></div>
      <div><label className="text-xs font-medium text-muted-foreground">Teléfono (opcional)</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} /></div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Elige tu paquete</label>
        <div className="mt-1 space-y-2">
          {packages.map((p) => (
            <label key={p.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${productId === p.id ? "border-primary bg-accent" : "border-border"}`}>
              <input type="radio" name="pkg" checked={productId === p.id} onChange={() => setProductId(p.id)} className="mt-1" />
              <span className="flex-1"><span className="font-medium">{p.name}</span>{p.description && <span className="block text-xs text-muted-foreground">{p.description}</span>}</span>
              <span className="font-semibold">{money(p.price)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Campo trampa: invisible para personas */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Sitio web<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={busy || !productId} className="surface-gradient w-full rounded-md py-2.5 text-sm font-semibold hover:opacity-95 disabled:opacity-60">{busy ? "Enviando…" : "Quiero registrarme"}</button>
    </form>
  );
}
