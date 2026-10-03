"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Ticket } from "@/modules/support/repository";

const priorityColor: Record<string, string> = {
  HIGH: "bg-red-500/10 text-red-600 dark:text-red-400",
  MEDIUM: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  LOW: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};
const statusLabel: Record<string, string> = { OPEN: "Abierto", IN_PROGRESS: "En proceso", CLOSED: "Cerrado" };

export function SupportClient({ tickets, isDemo }: { tickets: Ticket[]; isDemo: boolean }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Ticket["priority"]>("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, description, priority }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo crear el ticket");
      return;
    }
    setSubject("");
    setDescription("");
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Soporte</h1>
          <p className="text-sm text-muted-foreground">
            {tickets.length} ticket(s) {isDemo && "· datos de ejemplo"}
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus size={15} /> Nuevo ticket
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Ticket["priority"])}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear"}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      )}

      <div className="space-y-2">
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/support/${t.id}`}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted/50"
          >
            <div>
              <p className="text-sm font-medium">{t.subject}</p>
              <p className="mt-1 text-xs text-muted-foreground">{statusLabel[t.status]}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[t.priority]}`}>
              {t.priority === "HIGH" ? "Alta" : t.priority === "MEDIUM" ? "Media" : "Baja"}
            </span>
          </Link>
        ))}
        {tickets.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sin tickets todavía.
          </div>
        )}
      </div>
    </div>
  );
}
