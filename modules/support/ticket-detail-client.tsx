"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Ticket, TicketMessage } from "@/modules/support/repository";

const statusOptions: Ticket["status"][] = ["OPEN", "IN_PROGRESS", "CLOSED"];
const statusLabel: Record<string, string> = { OPEN: "Abierto", IN_PROGRESS: "En proceso", CLOSED: "Cerrado" };

export function TicketDetailClient({
  ticket,
  messages,
  isDemo,
}: {
  ticket: Ticket;
  messages: TicketMessage[];
  isDemo: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(newStatus: Ticket["status"]) {
    setStatus(newStatus);
    await fetch(`/api/support/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    await fetch(`/api/support/tickets/${ticket.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setLoading(false);
    setBody("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
          {ticket.description && <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>}
        </div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as Ticket["status"])}
          disabled={isDemo}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{statusLabel[s]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg border border-border bg-card p-3">
            <p className="text-sm">{m.body}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {m.authorEmail} · {new Date(m.createdAt).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Sin mensajes todavía.
          </p>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe una respuesta..."
          disabled={isDemo}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={loading || isDemo}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
