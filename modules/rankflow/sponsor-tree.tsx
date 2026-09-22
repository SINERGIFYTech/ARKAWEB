"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, User, Plus } from "lucide-react";
import { getSponsoredChildren, findById, type DistributorNode } from "@/modules/rankflow/data";
import { getRankColorClass } from "@/modules/rankflow/plan-config";
import { cn } from "@/lib/utils";

export function SponsorTree({
  distributors,
  ranks,
  rootId,
  onAddSponsored,
}: {
  distributors: DistributorNode[];
  ranks: string[];
  rootId: string;
  onAddSponsored: (sponsorId: string) => void;
}) {
  return <SponsorNode distributors={distributors} ranks={ranks} nodeId={rootId} generation={0} onAddSponsored={onAddSponsored} />;
}

function SponsorNode({
  distributors,
  ranks,
  nodeId,
  generation,
  onAddSponsored,
}: {
  distributors: DistributorNode[];
  ranks: string[];
  nodeId: string;
  generation: number;
  onAddSponsored: (sponsorId: string) => void;
}) {
  const [expanded, setExpanded] = useState(generation < 2);
  const self = findById(distributors, nodeId);
  const children = getSponsoredChildren(distributors, nodeId);

  if (!self) return null;

  return (
    <div>
      <div className="group flex items-center gap-2 py-1">
        {children.length > 0 ? (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <div
          className={cn(
            "flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2",
            self.status === "INACTIVE" && "opacity-50"
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
            <User size={13} className="text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{self.fullName}</p>
            <p className="truncate text-[10px] text-muted-foreground">{self.code}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium", getRankColorClass(ranks, self.rank))}>
            {self.rank}
          </span>
          {generation > 0 && <span className="shrink-0 text-[10px] text-muted-foreground">Gen {generation}</span>}
          <span className="shrink-0 text-[10px] text-muted-foreground">${self.personalVolume.toLocaleString("es-MX")} PV</span>
          <button
            onClick={() => onAddSponsored(nodeId)}
            title="Agregar patrocinado"
            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-primary group-hover:opacity-100"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {expanded && children.length > 0 && (
        <div className="ml-6 space-y-0.5 border-l border-border pl-3">
          {children.map((child) => (
            <SponsorNode
              key={child.id}
              distributors={distributors}
              ranks={ranks}
              nodeId={child.id}
              generation={generation + 1}
              onAddSponsored={onAddSponsored}
            />
          ))}
        </div>
      )}
    </div>
  );
}
