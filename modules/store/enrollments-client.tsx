"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EnrollmentRow } from "@/modules/store/repository";

const money = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-muted text-muted-foreground",
};
const statusLabel: Record<string, string> = { PENDING: "Esperando pago", PAID: "Confirmada", CANCELLED: "Cancelada" };

export function EnrollmentsClient({ enrollments, isDemo }: { enrollments: EnrollmentRow[]; isDemo: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function confirm(e: EnrollmentRow) {
    if (!window.confirm(`¿Confirmaste el pago de ${e.fullName} (${money(e.packagePrice)})? Se creará su cuenta de distribuidor.`)) return;
    setBusyId(e.id);
    setMessage(null);
    const res = await fetch(`/api/store/enrollments/${e.id}/confirm`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) return setMessage({ type: "error", text: body.error ?? "No se pudo confirmar" });
    setMessage({
      type: "ok",
      text: `${e.fullName} ya es distribuidor (código ${body.code}). ${body.inviteSent ? "Le enviamos el acceso a su portal por correo." : `No se pudo enviar su acceso al portal (${body.inviteMessage ?? "error"}); puedes reenviarlo desde Distribuidores.`}`,
    });
    router.refresh();
  }

  async function cancel(e: EnrollmentRow) {
    setBusyId(e.id);
    setMessage(null);
    const res = await fetch(`/api/store/enrollments/${e.id}/cancel`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) return setMessage({ type: "error", text: (await res.json().catch(() => ({}))).error ?? "No se pudo cancelar" });
    router.refresh();
  }

  const pending = enrollments.filter((e) => e.status === "PENDING").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inscripciones</h1>
        <p className="text-sm text-muted-foreground">
          {pending} esperando pago. Quien se registra con el link de un distribuidor aparece aquí; cuando confirmas su pago se crea su cuenta, ya colocada en la red, y su paquete genera volumen. {isDemo && "· modo demo"}
        </p>
      </div>
      {message && <p className={`rounded-lg px-4 py-3 text-sm ${message.type === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-600"}`}>{message.text}</p>}

      <div className="card-elevated overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Persona</th><th className="px-4 py-3 font-medium">Patrocinador</th><th className="px-4 py-3 font-medium">Paquete</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3"><p className="font-medium">{e.fullName}</p><p className="text-xs text-muted-foreground">{e.email}{e.phone ? ` · ${e.phone}` : ""}</p></td>
                <td className="px-4 py-3">{e.sponsorName} <span className="text-xs text-muted-foreground">{e.sponsorCode}{e.leg ? ` · ${e.leg === "LEFT" ? "izq." : "der."}` : ""}</span></td>
                <td className="px-4 py-3">{e.packageName} <span className="text-xs text-muted-foreground">{money(e.packagePrice)}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[e.status]}`}>{statusLabel[e.status]}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</td>
                <td className="px-4 py-3 text-right">
                  {e.status === "PENDING" && !isDemo && (
                    <span className="flex justify-end gap-3">
                      <button disabled={busyId === e.id} onClick={() => confirm(e)} className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-50">{busyId === e.id ? "…" : "Confirmar pago"}</button>
                      <button disabled={busyId === e.id} onClick={() => cancel(e)} className="text-xs text-muted-foreground hover:text-red-500">Cancelar</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {enrollments.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin inscripciones todavía. Cada distribuidor tiene su link de registro en su portal.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
