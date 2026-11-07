"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, Users2, LifeBuoy, Wallet } from "lucide-react";
import { filterActiveModules } from "@/lib/modules-registry";
import type { SearchResult } from "@/app/api/search/route";

const typeIcon = { distributor: Users2, ticket: LifeBuoy, invoice: Wallet };
const typeLabel = { distributor: "Distribuidores", ticket: "Tickets", invoice: "Facturas" };

export function CommandPalette({ enabledKeys }: { enabledKeys: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const openHandler = () => setOpen(true);
    document.addEventListener("keydown", handler);
    window.addEventListener("open-command-palette", openHandler);
    return () => {
      document.removeEventListener("keydown", handler);
      window.removeEventListener("open-command-palette", openHandler);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const body = await res.json();
        setResults(body.results ?? []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  if (!open) return null;

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search size={16} className="text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar módulos, distribuidores, tickets, facturas..."
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              Sin resultados.
            </Command.Empty>

            {query.trim().length < 2 && (
              <Command.Group heading="Módulos" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {filterActiveModules(enabledKeys).map((mod, i) => (
                  <Command.Item
                    key={`${mod.key}-${i}`}
                    onSelect={() => {
                      router.push(mod.href);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                  >
                    <mod.icon size={15} />
                    {mod.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {(Object.keys(grouped) as Array<keyof typeof typeLabel>).map((type) => (
              <Command.Group
                key={type}
                heading={typeLabel[type]}
                className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {grouped[type].map((r) => {
                  const Icon = typeIcon[type];
                  return (
                    <Command.Item
                      key={r.id}
                      onSelect={() => {
                        router.push(r.href);
                        setOpen(false);
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                    >
                      <Icon size={15} className="shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{r.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{r.subtitle}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
