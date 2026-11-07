"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Building2 } from "lucide-react";
import { filterActiveModules } from "@/lib/modules-registry";
import { cn } from "@/lib/utils";

export function Sidebar({ enabledKeys }: { enabledKeys: string[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const modules = filterActiveModules(enabledKeys);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-[68px]" : "w-[248px]"
      )}
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="surface-gradient stat-glow flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <Building2 size={16} />
        </div>
        {!collapsed && <span className="truncate text-sm font-bold tracking-tight">BackOffice Engine</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {modules.map((mod) => {
          const active = pathname === mod.href;
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              title={collapsed ? mod.name : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "surface-gradient shadow-md"
                  : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon size={17} className="shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span className="truncate">{mod.name}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-11 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>
    </aside>
  );
}
