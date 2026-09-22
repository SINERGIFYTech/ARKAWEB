"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddRootDistributorForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/rankflow/distributors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        fullName,
        sponsorId: null,
        placementParentId: null,
        placementLeg: null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo crear el distribuidor");
      return;
    }

    router.refresh();
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
      <p className="text-sm font-medium">Aún no hay distribuidores en esta organización</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Da de alta al primero (normalmente el dueño/fundador de la red) para empezar el árbol.
      </p>
      <form onSubmit={handleSubmit} className="mx-auto mt-4 flex max-w-sm flex-col gap-2">
        <input
          required
          placeholder="ID de distribuidor (ej. DZ-10001)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <input
          required
          placeholder="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear distribuidor raíz"}
        </button>
      </form>
    </div>
  );
}
