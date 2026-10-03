"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantModuleRow } from "@/modules/platform/admin-repository";

export function TenantModulesToggle({ tenantId, modules }: { tenantId: string; modules: TenantModuleRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(moduleKey: string, isEnabled: boolean) {
    setError(null);
    setBusy(moduleKey);
    const res = await fetch(`/api/admin/tenants/${tenantId}/modules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleKey, isEnabled }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo cambiar el módulo");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Módulos de este cliente</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Al apagar un módulo desaparece del menú del cliente y su URL directa deja de funcionar.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {modules.map((m) => (
          <label
            key={m.key}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span>
              {m.name} {m.isCore && <span className="text-xs text-muted-foreground">(siempre activo)</span>}
            </span>
            <input
              type="checkbox"
              checked={m.isEnabled}
              disabled={m.isCore || busy === m.key}
              onChange={(e) => toggle(m.key, e.target.checked)}
            />
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
