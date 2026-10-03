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
      const rankRequirements = { ...c.rankRequirements };
      if (oldName in rankRequirements) {
        rankRequirements[name] = rankRequirements[oldName];
        delete rankRequirements[oldName];
      }
      const amountsByRank = { ...c.rankBonus.amountsByRank };
      if (oldName in amountsByRank) {
        amountsByRank[name] = amountsByRank[oldName];
        delete amountsByRank[oldName];
      }
      return {
        ...c,
        ranks,
        rankRequirements,
        rankBonus: { ...c.rankBonus, amountsByRank },
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
    setConfig((c) => {
      const name = `Rango ${c.ranks.length + 1}`;
      return {
        ...c,
        ranks: [...c.ranks, name],
        rankRequirements: { ...c.rankRequirements, [name]: { personalVolume: 0, teamVolume: 0 } },
      };
    });
  }

  function removeRank(index: number) {
    setConfig((c) => {
      const removed = c.ranks[index];
      const ranks = c.ranks.filter((_, i) => i !== index);
      const capsByRank = { ...c.binary.capsByRank };
      delete capsByRank[removed];
      const rankRequirements = { ...c.rankRequirements };
      delete rankRequirements[removed];
      const amountsByRank = { ...c.rankBonus.amountsByRank };
      delete amountsByRank[removed];
      return {
        ...c,
        ranks,
        binary: { ...c.binary, capsByRank },
        rankRequirements,
        rankBonus: { ...c.rankBonus, amountsByRank },
      };
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
        <h2 className="text-sm font-semibold">Requisitos de rango</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Volumen personal y de equipo (patrocinio, incluye a todo el downline) mínimos para calificar a cada rango.
          Se usa en la pestaña Rangos para calcular quién sube o baja automáticamente.
        </p>
        <div className="mt-4 space-y-2">
          {config.ranks.map((rank) => {
            const req = config.rankRequirements[rank] ?? { personalVolume: 0, teamVolume: 0 };
            return (
              <div key={rank} className="grid grid-cols-3 items-center gap-2">
                <span className="text-sm font-medium">{rank}</span>
                <div>
                  <label className="text-[11px] text-muted-foreground">Vol. personal</label>
                  <input
                    type="number"
                    min={0}
                    value={req.personalVolume}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        rankRequirements: {
                          ...c.rankRequirements,
                          [rank]: { ...req, personalVolume: Number(e.target.value) },
                        },
                      }))
                    }
                    className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Vol. de equipo</label>
                  <input
                    type="number"
                    min={0}
                    value={req.teamVolume}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        rankRequirements: {
                          ...c.rankRequirements,
                          [rank]: { ...req, teamVolume: Number(e.target.value) },
                        },
                      }))
                    }
                    className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
            );
          })}
        </div>
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

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Bono de rango</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={config.rankBonus.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, rankBonus: { ...c.rankBonus, enabled: e.target.checked } }))}
            />
            Activo
          </label>
        </div>

        {config.rankBonus.enabled && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cuándo se paga</label>
              <select
                value={config.rankBonus.mode}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, rankBonus: { ...c.rankBonus, mode: e.target.value as "RECURRING" | "ONE_TIME" } }))
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="RECURRING">Fijo cada periodo por recalificación (mientras mantenga el rango)</option>
                <option value="ONE_TIME">Solo bienvenida (una vez, la primera vez que llega a ese rango)</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Se paga por el rango que el distribuidor califica con el volumen del periodo, al cerrarlo.
                {config.rankBonus.mode === "ONE_TIME" && " Si alguien salta varios rangos de golpe, solo cobra el rango al que llegó."}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">Monto por rango</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {config.ranks.map((rank) => (
                  <div key={rank}>
                    <label className="text-[11px] text-muted-foreground">{rank}</label>
                    <input
                      type="number"
                      min={0}
                      value={config.rankBonus.amountsByRank[rank] ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          rankBonus: {
                            ...c.rankBonus,
                            amountsByRank: { ...c.rankBonus.amountsByRank, [rank]: Number(e.target.value) },
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
          <h2 className="text-sm font-semibold">Matching bonus</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={config.matching.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, matching: { ...c.matching, enabled: e.target.checked } }))}
            />
            Activo
          </label>
        </div>

        {config.matching.enabled && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              % de lo que ganan tus patrocinados (binario + unilevel + generacional; no incluye bonos de rango) por nivel.
              Nivel 1 = patrocinados directos.
            </p>
            {config.matching.levelPercents.map((p, i) => (
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
                      const levelPercents = [...c.matching.levelPercents];
                      levelPercents[i] = fromPct(Number(e.target.value));
                      return { ...c, matching: { ...c.matching, levelPercents } };
                    })
                  }
                  className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-xs text-muted-foreground">%</span>
                <button
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      matching: { ...c.matching, levelPercents: c.matching.levelPercents.filter((_, idx) => idx !== i) },
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
                setConfig((c) => ({ ...c, matching: { ...c.matching, levelPercents: [...c.matching.levelPercents, 0] } }))
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
          <h2 className="text-sm font-semibold">Inicio rápido</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={config.fastStart.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, fastStart: { ...c.fastStart, enabled: e.target.checked } }))}
            />
            Activo
          </label>
        </div>
        {config.fastStart.enabled && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">% sobre el volumen del nuevo distribuidor</label>
              <input
                type="number" min={0} max={100} step={0.5}
                value={pct(config.fastStart.percent)}
                onChange={(e) => setConfig((c) => ({ ...c, fastStart: { ...c.fastStart, percent: fromPct(Number(e.target.value)) } }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ventana (días desde que se inscribió)</label>
              <input
                type="number" min={1}
                value={config.fastStart.windowDays}
                onChange={(e) => setConfig((c) => ({ ...c, fastStart: { ...c.fastStart, windowDays: Number(e.target.value) } }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <p className="col-span-2 text-[11px] text-muted-foreground">
              Se paga al patrocinador directo, sobre el volumen capturado a su nuevo distribuidor dentro de esos días.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Bono global</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={config.globalBonus.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, globalBonus: { ...c.globalBonus, enabled: e.target.checked } }))}
            />
            Activo
          </label>
        </div>
        {config.globalBonus.enabled && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">% del volumen total de la compañía</label>
              <input
                type="number" min={0} max={100} step={0.1}
                value={pct(config.globalBonus.poolPercent)}
                onChange={(e) => setConfig((c) => ({ ...c, globalBonus: { ...c.globalBonus, poolPercent: fromPct(Number(e.target.value)) } }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Rango mínimo para calificar</label>
              <select
                value={config.globalBonus.minRankToQualify}
                onChange={(e) => setConfig((c) => ({ ...c, globalBonus: { ...c.globalBonus, minRankToQualify: e.target.value } }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
              >
                {config.ranks.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Cómo se reparte</label>
              <select
                value={config.globalBonus.splitMethod}
                onChange={(e) => setConfig((c) => ({ ...c, globalBonus: { ...c.globalBonus, splitMethod: e.target.value as "EQUAL" | "PRO_RATA_VOLUME" } }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
              >
                <option value="EQUAL">Parejo entre todos los que califican</option>
                <option value="PRO_RATA_VOLUME">Proporcional al volumen de cada quien</option>
              </select>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Bono decembrino</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={config.christmasBonus.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, christmasBonus: { ...c.christmasBonus, enabled: e.target.checked } }))}
            />
            Activo
          </label>
        </div>
        {config.christmasBonus.enabled && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">% del volumen anual</label>
              <input
                type="number" min={0} max={100} step={0.1}
                value={pct(config.christmasBonus.percent)}
                onChange={(e) => setConfig((c) => ({ ...c, christmasBonus: { ...c.christmasBonus, percent: fromPct(Number(e.target.value)) } }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Sobre qué volumen</label>
              <select
                value={config.christmasBonus.basedOn}
                onChange={(e) => setConfig((c) => ({ ...c, christmasBonus: { ...c.christmasBonus, basedOn: e.target.value as "PERSONAL" | "TEAM" } }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
              >
                <option value="PERSONAL">Personal</option>
                <option value="TEAM">De equipo</option>
              </select>
            </div>
            <p className="col-span-2 text-[11px] text-muted-foreground">
              No se paga aquí — solo se activa el cálculo. Se corre una vez al año desde "Bono Decembrino" en el menú.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Calificación sostenida (auto, viaje, etc.)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Exige mantener un rango varios periodos SEGUIDOS. Monto en 0 = solo calificación (ej. viaje), monto mayor a 0 = se paga cada periodo mientras siga calificando (ej. auto).
        </p>
        <div className="mt-4 space-y-3">
          {config.qualificationBonuses.map((rule, i) => (
            <div key={rule.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <input
                  value={rule.name}
                  onChange={(e) => setConfig((c) => {
                    const qs = [...c.qualificationBonuses];
                    qs[i] = { ...qs[i], name: e.target.value };
                    return { ...c, qualificationBonuses: qs };
                  })}
                  placeholder="Nombre, ej. Auto por rango"
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none"
                />
                <button
                  onClick={() => setConfig((c) => ({ ...c, qualificationBonuses: c.qualificationBonuses.filter((_, idx) => idx !== i) }))}
                  className="rounded p-1.5 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Rango mínimo</label>
                  <select
                    value={rule.minRank}
                    onChange={(e) => setConfig((c) => {
                      const qs = [...c.qualificationBonuses];
                      qs[i] = { ...qs[i], minRank: e.target.value };
                      return { ...c, qualificationBonuses: qs };
                    })}
                    className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none"
                  >
                    {config.ranks.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Periodos seguidos</label>
                  <input
                    type="number" min={1}
                    value={rule.consecutivePeriods}
                    onChange={(e) => setConfig((c) => {
                      const qs = [...c.qualificationBonuses];
                      qs[i] = { ...qs[i], consecutivePeriods: Number(e.target.value) };
                      return { ...c, qualificationBonuses: qs };
                    })}
                    className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Monto (0 = solo calificación)</label>
                  <input
                    type="number" min={0}
                    value={rule.cashAmount}
                    onChange={(e) => setConfig((c) => {
                      const qs = [...c.qualificationBonuses];
                      qs[i] = { ...qs[i], cashAmount: Number(e.target.value) };
                      return { ...c, qualificationBonuses: qs };
                    })}
                    className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setConfig((c) => ({
            ...c,
            qualificationBonuses: [
              ...c.qualificationBonuses,
              { id: crypto.randomUUID(), name: `Bono ${c.qualificationBonuses.length + 1}`, minRank: c.ranks[c.ranks.length - 1], consecutivePeriods: 3, cashAmount: 0 },
            ],
          }))}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Plus size={13} /> Agregar bono de calificación
        </button>
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
