"use client";

import { useState } from "react";
import { BinaryTree } from "@/modules/rankflow/binary-tree";
import { SponsorTree } from "@/modules/rankflow/sponsor-tree";
import type { DistributorNode } from "@/modules/rankflow/data";

export function PortalTeamClient({
  distributors,
  ranks,
  binaryEnabled,
  rootId,
}: {
  distributors: DistributorNode[];
  ranks: string[];
  binaryEnabled: boolean;
  rootId: string;
}) {
  const [tab, setTab] = useState<"binario" | "patrocinio">(binaryEnabled ? "binario" : "patrocinio");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Mi Equipo</h1>

      <div className="flex gap-1 border-b border-border">
        {binaryEnabled && (
          <button
            onClick={() => setTab("binario")}
            className={`px-3 py-2 text-sm font-medium ${tab === "binario" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Árbol Binario
          </button>
        )}
        <button
          onClick={() => setTab("patrocinio")}
          className={`px-3 py-2 text-sm font-medium ${tab === "patrocinio" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Árbol de Patrocinio
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-background p-8">
        {tab === "binario" && binaryEnabled ? (
          <BinaryTree distributors={distributors} ranks={ranks} rootId={rootId} />
        ) : (
          <SponsorTree distributors={distributors} ranks={ranks} rootId={rootId} />
        )}
      </div>
    </div>
  );
}
