"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, User, Plus } from "lucide-react";
import { getSponsoredChildren, findById, type DistributorNode } from "@/modules/rankflow/data";
import { getRankColorClass } from "@/modules/rankflow/plan-config";
import { cn } from "@/lib/utils";

function DistributorCard({ node, ranks, generation }: { node: DistributorNode; ranks: string[]; generation: number }) {
  return (
    <div
      className={cn(
        "flex w-48 items-center gap-2 rounded-lg border border-border bg-card p-2.5 shadow-sm",
        node.status === "INACTIVE" && "opacity-50"
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <User size={14} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{node.fullName}</p>
        <p className="truncate text-[10px] text-muted-foreground">{node.code}</p>
        <div className="mt-0.5 flex items-center gap-1">
          <span className={cn("inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium", getRankColorClass(ranks, node.rank))}>
            {node.rank}
          </span>
          {generation > 0 && <span className="text-[10px] text-muted-foreground">Gen {generation}</span>}
        </div>
      </div>
    </div>
  );
}

function AddChildSlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-14 w-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
    >
      <Plus size={13} />
      <span className="text-[10px]">Agregar patrocinado</span>
    </button>
  );
}

export function SponsorTree({
  distributors,
  ranks,
  rootId,
  onAddSponsored,
}: {
  distributors: DistributorNode[];
  ranks: string[];
  rootId: string;
  onAddSponsored?: (sponsorId: string) => void;
}) {
  return <SponsorSubtree distributors={distributors} ranks={ranks} nodeId={rootId} depth={0} generation={0} onAddSponsored={onAddSponsored} />;
}

function SponsorSubtree({
  distributors,
  ranks,
  nodeId,
  depth,
  generation,
  onAddSponsored,
}: {
  distributors: DistributorNode[];
  ranks: string[];
  nodeId: string;
  depth: number;
  generation: number;
  onAddSponsored?: (sponsorId: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const self = findById(distributors, nodeId);
  const children = getSponsoredChildren(distributors, nodeId);

  if (!self) return null;

  const showAddSlot = expanded && depth < 6 && !!onAddSponsored;
  const columns = children.length + (showAddSlot ? 1 : 0);

  return (
    <div className="flex flex-col items-center">
      <button onClick={() => setExpanded((e) => !e)} className="group relative">
        <DistributorCard node={self} ranks={ranks} generation={generation} />
        {(children.length > 0 || showAddSlot) && (
          <span className="absolute -bottom-2 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </span>
        )}
      </button>

      {expanded && columns > 0 && (
        <div className="flex flex-col items-center">
          <div className="h-4 w-px bg-border" />
          <div className="flex items-start">
            {children.map((child, i) => (
              <div key={child.id} className="relative flex flex-col items-center px-3">
                {columns > 1 && (
                  <div
                    className={cn(
                      "absolute top-0 h-px bg-border",
                      i === 0 ? "left-1/2 right-0" : i === columns - 1 && !showAddSlot ? "left-0 right-1/2" : "left-0 right-0"
                    )}
                  />
                )}
                <div className="h-4 w-px bg-border" />
                <SponsorSubtree
                  distributors={distributors}
                  ranks={ranks}
                  nodeId={child.id}
                  depth={depth + 1}
                  generation={generation + 1}
                  onAddSponsored={onAddSponsored}
                />
              </div>
            ))}
            {showAddSlot && (
              <div className="relative flex flex-col items-center px-3">
                {columns > 1 && (
                  <div className={cn("absolute top-0 h-px bg-border", "left-0 right-1/2")} />
                )}
                <div className="h-4 w-px bg-border" />
                <AddChildSlot onClick={() => onAddSponsored?.(nodeId)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
