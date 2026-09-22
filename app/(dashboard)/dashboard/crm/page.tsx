"use client";

import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { leads, stageColor, type Lead } from "@/modules/crm/data";

const stages: Array<Lead["stage"] | "Todos"> = [
  "Todos",
  "Nuevo",
  "Contactado",
  "Propuesta",
  "Ganado",
  "Perdido",
];

export default function CrmPage() {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<(typeof stages)[number]>("Todos");

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchesStage = stage === "Todos" || l.stage === stage;
      const matchesQuery =
        l.name.toLowerCase().includes(query.toLowerCase()) ||
        l.company.toLowerCase().includes(query.toLowerCase());
      return matchesStage && matchesQuery;
    });
  }, [query, stage]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} oportunidades
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus size={15} /> Nuevo lead
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o empresa..."
            className="w-56 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-1">
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                stage === s
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Etapa</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Último contacto</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-border last:border-0 hover:bg-muted/50"
              >
                <td className="px-4 py-3 font-medium">{lead.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{lead.company}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${stageColor[lead.stage]}`}
                  >
                    {lead.stage}
                  </span>
                </td>
                <td className="px-4 py-3">${lead.value.toLocaleString("es-MX")}</td>
                <td className="px-4 py-3 text-muted-foreground">{lead.owner}</td>
                <td className="px-4 py-3 text-muted-foreground">{lead.lastContact}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
