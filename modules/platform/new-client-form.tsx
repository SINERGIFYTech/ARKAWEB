"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

export function NewClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
    const res = await fetch("/api/admin/tenants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyName, ownerEmail }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "No se pudo crear el cliente");
    setOk(`Cliente creado. Le enviamos la invitación a ${ownerEmail}.`);
    setCompanyName("");
    setOwnerEmail("");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <UserPlus size={15} /> Nuevo cliente
        </button>
      ) : (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="text-xs font-medium text-muted-foreground">Empresa</label>
            <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="text-xs font-medium text-muted-foreground">Correo del dueño</label>
            <input required type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">{busy ? "Creando…" : "Crear e invitar"}</button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">Cerrar</button>
          {error && <p className="w-full text-xs text-red-500">{error}</p>}
        </form>
      )}
      {ok && <p className="mt-2 text-xs text-emerald-600">{ok}</p>}
    </div>
  );
}
