"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { BinaryTree } from "@/modules/rankflow/binary-tree";
import { SponsorTree } from "@/modules/rankflow/sponsor-tree";
import { getLegVolume, getPlacementChildren, type DistributorNode } from "@/modules/rankflow/data";
import { AddRootDistributorForm } from "@/modules/rankflow/add-root-distributor-form";
import { AddDistributorModal, type AddDistributorPrefill } from "@/modules/rankflow/add-distributor-modal";

export function GenealogyClient({
  distributors,
  ranks,
  isDemo,
}: {
  distributors: DistributorNode[];
  ranks: string[];
  isDemo: boolean;
}) {
  const [tab, setTab] = useState<"binario" | "patrocinio">("binario");
  const [modalPrefill, setModalPrefill] = useState<AddDistributorPrefill | null>(null);

  if (distributors.length === 0) {
    return <AddRootDistributorForm />;
  }

  const root = distributors.find((d) => d.sponsorId === null) ?? distributors[0];
  const children = getPlacementChildren(distributors, root.id);
  const left = children.find((c) => c.placementLeg === "LEFT");
  const right = children.find((c) => c.placementLeg === "RIGHT");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Genealogía</h1>
          <p className="text-sm text-muted-foreground">
            Árbol de colocación (binario) y árbol de patrocinio (unilevel/generaciones)
            {isDemo && " · datos de ejemplo, conecta Supabase para datos reales"}
          </p>
        </div>
        <Link
          href="/dashboard/rankflow/settings"
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <Settings size={14} /> Plan de compensación
        </Link>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("binario")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "binario" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Árbol Binario
        </button>
        <button
          onClick={() => setTab("patrocinio")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "patrocinio" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Árbol de Patrocinio
        </button>
      </div>

      {tab === "binario" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:w-96">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Volumen pierna izquierda</p>
              <p className="mt-1 text-xl font-semibold">
                ${(left ? getLegVolume(distributors, left.id) : 0).toLocaleString("es-MX")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Volumen pierna derecha</p>
              <p className="mt-1 text-xl font-semibold">
                ${(right ? getLegVolume(distributors, right.id) : 0).toLocaleString("es-MX")}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-background p-8">
            <BinaryTree
              distributors={distributors}
              ranks={ranks}
              rootId={root.id}
              onAddPlacement={(parentId, leg) =>
                setModalPrefill({ placementParentId: parentId, placementLeg: leg })
              }
            />
          </div>
        </div>
      )}

      {tab === "patrocinio" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <SponsorTree
            distributors={distributors}
            ranks={ranks}
            rootId={root.id}
            onAddSponsored={(sponsorId) => setModalPrefill({ sponsorId })}
          />
        </div>
      )}

      {modalPrefill && (
        <AddDistributorModal
          distributors={distributors}
          prefill={modalPrefill}
          onClose={() => setModalPrefill(null)}
        />
      )}
    </div>
  );
}
