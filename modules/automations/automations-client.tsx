"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Zap, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import {
  TRIGGER_TYPES,
  OPERATORS,
  ACTION_TYPES,
  type TriggerType,
  type Operator,
  type ActionType,
  type AutomationRule,
  type AutomationCondition,
  type AutomationAction,
} from "@/modules/automations/types";
import type { AutomationRunLog } from "@/modules/automations/repository";

const emptyCondition = (): AutomationCondition => ({ field: "", operator: "equals", value: "" });
const emptyAction = (): AutomationAction => ({ type: "notification.create", config: {} });

function RuleForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("distributor.created");
  const [conditions, setConditions] = useState<AutomationCondition[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([emptyAction()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fields = TRIGGER_TYPES[triggerType].fields;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, triggerType, isEnabled: true, conditions, actions }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo guardar");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Nombre de la regla</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. Avisar cuando alguien llega a Diamante"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Cuándo (trigger)</label>
        <select
          value={triggerType}
          onChange={(e) => {
            setTriggerType(e.target.value as TriggerType);
            setConditions([]);
          }}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          {Object.entries(TRIGGER_TYPES).map(([key, t]) => (
            <option key={key} value={key}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Condiciones (opcional — si no agregas ninguna, siempre corre)</label>
          <button
            type="button"
            onClick={() => setConditions((c) => [...c, emptyCondition()])}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus size={12} /> Agregar condición
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {conditions.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={c.field}
                onChange={(e) => setConditions((cs) => cs.map((x, idx) => (idx === i ? { ...x, field: e.target.value } : x)))}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none"
              >
                <option value="">campo...</option>
                {fields.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select
                value={c.operator}
                onChange={(e) =>
                  setConditions((cs) => cs.map((x, idx) => (idx === i ? { ...x, operator: e.target.value as Operator } : x)))
                }
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none"
              >
                {Object.entries(OPERATORS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <input
                value={c.value}
                onChange={(e) => setConditions((cs) => cs.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
                placeholder="valor"
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => setConditions((cs) => cs.filter((_, idx) => idx !== i))}
                className="rounded p-1 text-red-500 hover:bg-red-500/10"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Entonces (acciones)</label>
          <button
            type="button"
            onClick={() => setActions((a) => [...a, emptyAction()])}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus size={12} /> Agregar acción
          </button>
        </div>
        <div className="mt-2 space-y-3">
          {actions.map((a, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <select
                  value={a.type}
                  onChange={(e) =>
                    setActions((as) =>
                      as.map((x, idx) => (idx === i ? { type: e.target.value as ActionType, config: {} } : x))
                    )
                  }
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none"
                >
                  {Object.entries(ACTION_TYPES).map(([key, t]) => (
                    <option key={key} value={key}>{t.label}</option>
                  ))}
                </select>
                {actions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActions((as) => as.filter((_, idx) => idx !== i))}
                    className="rounded p-1 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {ACTION_TYPES[a.type].fields.map((f) => (
                <input
                  key={f}
                  value={a.config[f] ?? ""}
                  onChange={(e) =>
                    setActions((as) =>
                      as.map((x, idx) => (idx === i ? { ...x, config: { ...x.config, [f]: e.target.value } } : x))
                    )
                  }
                  placeholder={`${f} (puedes usar {{campo}} del evento, ej. {{fullName}})`}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none"
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar regla"}
        </button>
      </div>
    </form>
  );
}

const statusIcon = { SUCCESS: CheckCircle2, ERROR: XCircle, SKIPPED: MinusCircle };
const statusColor = { SUCCESS: "text-emerald-600", ERROR: "text-red-500", SKIPPED: "text-muted-foreground" };

export function AutomationsClient({
  rules,
  runs,
  isDemo,
}: {
  rules: AutomationRule[];
  runs: AutomationRunLog[];
  isDemo: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  async function toggle(id: string, isEnabled: boolean) {
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta regla?")) return;
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automatizaciones</h1>
          <p className="text-sm text-muted-foreground">
            Reglas que se disparan solas cuando algo pasa en tu backoffice {isDemo && "· modo demo"}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            disabled={isDemo}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Plus size={15} /> Nueva regla
          </button>
        )}
      </div>

      {showForm && (
        <RuleForm
          onSaved={() => {
            setShowForm(false);
            router.refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className={r.isEnabled ? "text-primary" : "text-muted-foreground"} />
                <span className="text-sm font-medium">{r.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" checked={r.isEnabled} onChange={(e) => toggle(r.id, e.target.checked)} />
                  Activa
                </label>
                <button onClick={() => remove(r.id)} className="rounded p-1.5 text-red-500 hover:bg-red-500/10">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {TRIGGER_TYPES[r.triggerType].label} · {r.actions.length} acción(es)
              {r.conditions.length > 0 && ` · ${r.conditions.length} condición(es)`}
            </p>
          </div>
        ))}
        {rules.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sin reglas todavía.
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Historial de ejecuciones recientes</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Regla</th>
                <th className="px-4 py-2 font-medium">Trigger</th>
                <th className="px-4 py-2 font-medium">Resultado</th>
                <th className="px-4 py-2 font-medium">Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const Icon = statusIcon[run.status];
                return (
                  <tr key={run.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-medium">{run.ruleName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{run.triggerType}</td>
                    <td className={`px-4 py-2 ${statusColor[run.status]}`}>
                      <span className="flex items-center gap-1.5">
                        <Icon size={13} /> {run.detail ?? run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Sin ejecuciones todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
