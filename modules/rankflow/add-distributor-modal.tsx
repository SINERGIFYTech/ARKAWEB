"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { DistributorNode } from "@/modules/rankflow/data";

export interface AddDistributorPrefill {
  sponsorId?: string; // si viene del árbol de patrocinio, ya está fijo
  placementParentId?: string; // si viene del árbol binario, ya está fijo
  placementLeg?: "LEFT" | "RIGHT";
}

export function AddDistributorModal({
  distributors,
  prefill,
  onClose,
}: {
  distributors: DistributorNode[];
  prefill: AddDistributorPrefill;
  onClose: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [sponsorId, setSponsorId] = useState(prefill.sponsorId ?? "");
  const [placeInBinary, setPlaceInBinary] = useState(!!prefill.placementParentId);
  const [placementParentId, setPlacementParentId] = useState(prefill.placementParentId ?? "");
  const [placementLeg, setPlacementLeg] = useState<"LEFT" | "RIGHT">(prefill.placementLeg ?? "LEFT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sponsorLocked = !!prefill.sponsorId;
  const placementLocked = !!prefill.placementParentId;

  const sortedDistributors = [...distributors].sort((a, b) => a.fullName.localeCompare(b.fullName));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sponsorId) {
      setError("Elige un patrocinador");
      return;
    }
    if (placeInBinary && !placementParentId) {
      setError("Elige bajo quién se coloca en el binario, o desactiva esa opción");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/rankflow/distributors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        fullName,
        sponsorId,
        placementParentId: placeInBinary ? placementParentId : null,
        placementLeg: placeInBinary ? placementLeg : null,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo crear el distribuidor");
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Agregar distribuidor</h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">ID de distribuidor</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ej. DZ-10016"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nombre completo</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Patrocinador (quién lo inscribió)</label>
            {sponsorLocked ? (
              <p className="mt-1 rounded-md border border-border bg-muted px-3 py-2 text-sm">
                {distributors.find((d) => d.id === sponsorId)?.fullName ?? "—"}
              </p>
            ) : (
              <select
                required
                value={sponsorId}
                onChange={(e) => setSponsorId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Selecciona...</option>
                {sortedDistributors.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName} ({d.code})</option>
                ))}
              </select>
            )}
          </div>

          <div className="rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={placeInBinary}
                disabled={placementLocked}
                onChange={(e) => setPlaceInBinary(e.target.checked)}
              />
              Colocar en el árbol binario ahora
            </label>

            {placeInBinary && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Bajo quién</label>
                  {placementLocked ? (
                    <p className="mt-1 rounded-md border border-border bg-muted px-2 py-1.5 text-sm">
                      {distributors.find((d) => d.id === placementParentId)?.fullName ?? "—"}
                    </p>
                  ) : (
                    <select
                      value={placementParentId}
                      onChange={(e) => setPlacementParentId(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">Selecciona...</option>
                      {sortedDistributors.map((d) => (
                        <option key={d.id} value={d.id}>{d.fullName} ({d.code})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Pierna</label>
                  {placementLocked ? (
                    <p className="mt-1 rounded-md border border-border bg-muted px-2 py-1.5 text-sm">
                      {placementLeg === "LEFT" ? "Izquierda" : "Derecha"}
                    </p>
                  ) : (
                    <select
                      value={placementLeg}
                      onChange={(e) => setPlacementLeg(e.target.value as "LEFT" | "RIGHT")}
                      className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="LEFT">Izquierda</option>
                      <option value="RIGHT">Derecha</option>
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Creando..." : "Agregar distribuidor"}
          </button>
        </form>
      </div>
    </div>
  );
}
