"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { CompensationPlanConfig } from "@/modules/rankflow/plan-config";

function pct(n: number) {
  return Math.round(n * 1000) / 10;
}
function fromPct(n: number) {
  return n / 100;
}

export function SettingsClient({
  initialConfig,
  isDemo,
}: {
  initialConfig: CompensationPlanConfig;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<CompensationPlanConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function updateRankName(index: number, name: string) {
    setConfig((c) => {
      const oldName = c.ranks[index];
      const ranks = c.ranks.map((r, i) => (i === index ? name : r));
      const capsByRank = { ...c.binary.capsByRank };
      if (oldName in capsByRank) {
        capsByRank[name] = capsByRank[oldName];
        delete capsByRank[oldName];
      }
      return {
        ...c,
        ranks,
        binary: { ...c.binary, capsByRank },
        generation: {
          ...c.generation,
          minRankToEarn: c.generation.minRankToEarn === oldName ? name : c.generation.minRankToEarn,
          minRankForLeader: c.generation.minRankForLeader === oldName ? name : c.generation.minRankForLeader,
        },
      };
    });
  }

  function addRank() {
    setConfig((c) => ({ ...c, ranks: [...c.ranks, `Rango ${c.ranks.length + 1}`] }));
  }

  function removeRank(index: number) {
    setConfig((c) => {
      const removed = c.ranks[index];
      const ranks = c.ranks.filter((_, i) => i !== index);
      const capsByRank = { ...c.binary.capsByRank };
      delete capsByRank[removed];
      return { ...c, ranks, binary: { ...c.binary, capsByRank } };
    });
  }

  function moveRank(index: number, dir: -1 | 1) {
    setConfig((c) => {
      const ranks = [...c.ranks];
      const target = index + dir;
      if (target < 0 || target >= ranks.length) return c;
      [ranks[index], ranks[target]] = [ranks[target], ranks[index]];
      return { ...c, ranks };
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/rankflow/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: body.error ?? "No se pudo guardar" });
      return;
    }
    setMessage({ type: "ok", text: "Plan guardado — ya aplica en Comisiones." });
    router.refresh();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan de compensación</h1>
        <p className="text-sm text-muted-foreground">
          Define los rangos y la combinación binario / unilevel / generacional de tu compañía.
          {isDemo && " Estás en modo demo — conecta Supabase para guardar cambios reales."}
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Rangos</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Ordenados de menor a mayor. Se usan para los topes del binario y para calificar el bono generacional.
        </p>
        <div className="mt-4 space-y-2">
          {config.ranks.map((rank, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
              <input
                value={rank}
                onChange={(e) => updateRankName(i, e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button onClick={() => moveRank(i, -1)} disabled={i === 0} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30">
                <ArrowUp size={14} />
              </button>
              <button onClick={() => moveRank(i, 1)} disabled={i === config.ranks.length - 1} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30">
                <ArrowDown size={14} />
              </button>
              <button onClick={() => removeRank(i)} className="rounded p-1.5 text-red-500 hover:bg-red-500/10">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addRank} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
          <Plus size={13} /> Agregar rango
        </button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Binario</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={config.binary.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, binary: { ...c.binary, enabled: e.target.checked } }))}
            />
            Activo
          </label>
        </div>

        {config.binary.enabled && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">% sobre la pierna menor</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={pct(config.binary.percent)}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, binary: { ...c.binary, percent: fromPct(Number(e.target.value)) } }))
                }
                className="mt-1 w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="ml-2 text-xs text-muted-foreground">%</span>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">Tope semanal por rango (excedente se descarta)</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {config.ranks.map((rank) => (
                  <div key={rank}>
                    <label className="text-[11px] text-muted-foreground">{rank}</label>
                    <input
                      type="number"
                      min={0}
                      value={config.binary.capsByRank[rank] ?? ""}
                      placeholder="sin tope"
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          binary: {
                            ...c.binary,
                            capsByRank: { ...c.binary.capsByRank, [rank]: Number(e.target.value) },
                          },
                        }))
                      }
                      className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Unilevel</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={config.unilevel.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, unilevel: { ...c.unilevel, enabled: e.target.checked } }))}
            />
            Activo
          </label>
        </div>

        {config.unilevel.enabled && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">% por nivel de profundidad de patrocinio</p>
            {config.unilevel.levelPercents.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">Nivel {i + 1}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={pct(p)}
                  onChange={(e) =>
                    setConfig((c) => {
                      const levelPercents = [...c.unilevel.levelPercents];
                      levelPercents[i] = fromPct(Number(e.target.value));
                      return { ...c, unilevel: { ...c.unilevel, levelPercents } };
                    })
                  }
                  className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-xs text-muted-foreground">%</span>
                <button
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      unilevel: { ...c.unilevel, levelPercents: c.unilevel.levelPercents.filter((_, idx) => idx !== i) },
                    }))
                  }
                  className="rounded p-1.5 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setConfig((c) => ({ ...c, unilevel: { ...c.unilevel, levelPercents: [...c.unilevel.levelPercents, 0] } }))
              }
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Plus size={13} /> Agregar nivel
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Generacional</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={config.generation.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, generation: { ...c.generation, enabled: e.target.checked } }))}
            />
            Activo
          </label>
        </div>

        {config.generation.enabled && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Rango mínimo para cobrar</label>
                <select
                  value={config.generation.minRankToEarn}
                  onChange={(e) => setConfig((c) => ({ ...c, generation: { ...c.generation, minRankToEarn: e.target.value } }))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {config.ranks.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Rango que corta generación (breakaway)</label>
                <select
                  value={config.generation.minRankForLeader}
                  onChange={(e) => setConfig((c) => ({ ...c, generation: { ...c.generation, minRankForLeader: e.target.value } }))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {config.ranks.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">% por generación</p>
              {config.generation.percents.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">Gen {i + 1}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={pct(p)}
                    onChange={(e) =>
                      setConfig((c) => {
                        const percents = [...c.generation.percents];
                        percents[i] = fromPct(Number(e.target.value));
                        return { ...c, generation: { ...c.generation, percents } };
                      })
                    }
                    className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <button
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        generation: { ...c.generation, percents: c.generation.percents.filter((_, idx) => idx !== i) },
                      }))
                    }
                    className="rounded p-1.5 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setConfig((c) => ({ ...c, generation: { ...c.generation, percents: [...c.generation.percents, 0] } }))
                }
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Plus size={13} /> Agregar generación
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar plan"}
        </button>
        {message && (
          <span className={`text-sm ${message.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>{message.text}</span>
        )}
      </div>
    </div>
  );
}
