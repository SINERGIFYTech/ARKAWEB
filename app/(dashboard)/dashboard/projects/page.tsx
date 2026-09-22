"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

interface Task {
  id: string;
  title: string;
  assignee: string;
}

type Column = "Por hacer" | "En progreso" | "En revisión" | "Hecho";

const initialBoard: Record<Column, Task[]> = {
  "Por hacer": [
    { id: "t1", title: "Definir alcance módulo Finance", assignee: "Ana" },
    { id: "t2", title: "Wireframes AgencyFlow", assignee: "Luis" },
  ],
  "En progreso": [
    { id: "t3", title: "Middleware de resolución de tenant", assignee: "Diego" },
  ],
  "En revisión": [
    { id: "t4", title: "RLS policies módulo CRM", assignee: "Ana" },
  ],
  Hecho: [
    { id: "t5", title: "Setup monorepo Turborepo", assignee: "Diego" },
    { id: "t6", title: "Theme engine (dark mode)", assignee: "Luis" },
  ],
};

const columns: Column[] = ["Por hacer", "En progreso", "En revisión", "Hecho"];

export default function ProjectsPage() {
  const [board] = useState(initialBoard);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
          <p className="text-sm text-muted-foreground">Tablero: BackOffice Engine — Fase 1</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus size={15} /> Nueva tarea
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col) => (
          <div key={col} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {col}
              </h3>
              <span className="text-xs text-muted-foreground">{board[col].length}</span>
            </div>
            <div className="space-y-2">
              {board[col].map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-border bg-background p-3 text-sm shadow-sm"
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{task.assignee}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
