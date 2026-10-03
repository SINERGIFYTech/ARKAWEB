"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PortalTicket } from "@/modules/portal/repository";

const statusLabel: Record<string, string> = { OPEN: "Abierto", IN_PROGRESS: "En proceso", CLOSED: "Cerrado" };

export function PortalHelpClient({ tickets }: { tickets: PortalTicket[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/portal/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, description }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo enviar");
      return;
    }
    setSubject("");
    setDescription("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Centro de Ayuda</h1>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="¿En qué necesitas ayuda?"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe el detalle (opcional)"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </form>

      <div className="space-y-2">
        {tickets.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <span className="text-sm font-medium">{t.subject}</span>
            <span className="text-xs text-muted-foreground">{statusLabel[t.status]}</span>
          </div>
        ))}
        {tickets.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Sin solicitudes todavía.
          </p>
        )}
      </div>
    </div>
  );
}
