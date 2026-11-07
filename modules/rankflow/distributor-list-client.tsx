"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import type { DistributorListRow } from "@/modules/rankflow/repository";

const rankBadge = "rounded-full bg-muted px-2 py-0.5 text-xs font-medium";

function InviteCell({ row }: { row: DistributorListRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(row.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (row.hasPortalAccess) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={13} /> Tiene acceso
      </span>
    );
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
        <Send size={12} /> Dar acceso al portal
      </button>
    );
  }

  async function send() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/rankflow/distributors/invite-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distributorId: row.id, email }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo invitar");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@..."
        className="w-40 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
      />
      <button onClick={send} disabled={loading || !email} className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-60">
        {loading ? "..." : "Enviar"}
      </button>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
}

export function DistributorListClient({ rows, isDemo }: { rows: DistributorListRow[]; isDemo: boolean }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Distribuidores</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} distribuidor(es) {isDemo && "· datos de ejemplo"}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Rango</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Portal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{r.fullName}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.code}</td>
                <td className="px-4 py-3"><span className={rankBadge}>{r.rank}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{r.status === "ACTIVE" ? "Activo" : "Inactivo"}</td>
                <td className="px-4 py-3">{isDemo ? <span className="text-xs text-muted-foreground">—</span> : <InviteCell row={r} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
