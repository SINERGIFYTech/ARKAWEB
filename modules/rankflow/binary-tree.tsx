"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, User, Plus } from "lucide-react";
import {
  getPlacementChildren,
  getLegVolume,
  findById,
  type DistributorNode,
} from "@/modules/rankflow/data";
import { getRankColorClass } from "@/modules/rankflow/plan-config";
import { cn } from "@/lib/utils";

function DistributorCard({ node, ranks }: { node: DistributorNode; ranks: string[] }) {
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
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{node.fullName}</p>
        <p className="truncate text-[10px] text-muted-foreground">{node.code}</p>
        <span className={cn("mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium", getRankColorClass(ranks, node.rank))}>
          {node.rank}
        </span>
      </div>
    </div>
  );
}

function EmptySlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-16 w-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
    >
      <Plus size={14} />
      <span className="text-[10px]">Agregar</span>
    </button>
  );
}

export function BinaryTree({
  distributors,
  ranks,
  rootId,
  onAddPlacement,
}: {
  distributors: DistributorNode[];
  ranks: string[];
  rootId: string;
  onAddPlacement: (parentId: string, leg: "LEFT" | "RIGHT") => void;
}) {
  return <BinarySubtree distributors={distributors} ranks={ranks} nodeId={rootId} depth={0} onAddPlacement={onAddPlacement} />;
}

function BinarySubtree({
  distributors,
  ranks,
  nodeId,
  depth,
  onAddPlacement,
}: {
  distributors: DistributorNode[];
  ranks: string[];
  nodeId: string;
  depth: number;
  onAddPlacement: (parentId: string, leg: "LEFT" | "RIGHT") => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const self = findById(distributors, nodeId);
  const children = getPlacementChildren(distributors, nodeId);
  const left = children.find((c) => c.placementLeg === "LEFT") ?? null;
  const right = children.find((c) => c.placementLeg === "RIGHT") ?? null;

  if (!self) return null;

  return (
    <div className="flex flex-col items-center">
      <button onClick={() => setExpanded((e) => !e)} className="group relative">
        <DistributorCard node={self} ranks={ranks} />
        <span className="absolute -bottom-2 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </span>
      </button>

      {expanded && (
        <div className="mt-6 flex items-start gap-8">
          <div className="flex flex-col items-center">
            <span className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
              Izq · ${left ? getLegVolume(distributors, left.id).toLocaleString("es-MX") : 0}
            </span>
            {left ? (
              <BinarySubtree distributors={distributors} ranks={ranks} nodeId={left.id} depth={depth + 1} onAddPlacement={onAddPlacement} />
            ) : (
              <EmptySlot onClick={() => onAddPlacement(nodeId, "LEFT")} />
            )}
          </div>
          <div className="flex flex-col items-center">
            <span className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
              Der · ${right ? getLegVolume(distributors, right.id).toLocaleString("es-MX") : 0}
            </span>
            {right ? (
              <BinarySubtree distributors={distributors} ranks={ranks} nodeId={right.id} depth={depth + 1} onAddPlacement={onAddPlacement} />
            ) : (
              <EmptySlot onClick={() => onAddPlacement(nodeId, "RIGHT")} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
