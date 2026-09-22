import {
  LayoutDashboard,
  Users2,
  KanbanSquare,
  Wallet,
  LifeBuoy,
  Boxes,
  Workflow,
  Sparkles,
  BarChart3,
  Network,
  Coins,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "core"
  | "crm"
  | "projects"
  | "finance"
  | "hr"
  | "inventory"
  | "support"
  | "automations"
  | "ai"
  | "analytics"
  | "rankflow";

export interface ModuleManifest {
  key: ModuleKey;
  name: string;
  href: string;
  icon: LucideIcon;
  isCore?: boolean;
}

// En producción esta lista se filtra por `tenant_modules` (activos) desde la BD.
// Aquí se define el catálogo completo disponible en el Core.
export const MODULE_REGISTRY: ModuleManifest[] = [
  { key: "core", name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, isCore: true },
  { key: "rankflow", name: "Genealogía (RankFlow)", href: "/dashboard/rankflow/genealogy", icon: Network },
  { key: "rankflow", name: "Comisiones", href: "/dashboard/rankflow/commissions", icon: Coins },
  { key: "crm", name: "CRM", href: "/dashboard/crm", icon: Users2 },
  { key: "projects", name: "Proyectos", href: "/dashboard/projects", icon: KanbanSquare },
  { key: "finance", name: "Finanzas", href: "/dashboard/finance", icon: Wallet },
  { key: "support", name: "Soporte", href: "/dashboard/support", icon: LifeBuoy },
  { key: "inventory", name: "Inventario", href: "/dashboard/inventory", icon: Boxes },
  { key: "automations", name: "Automatizaciones", href: "/dashboard/automations", icon: Workflow },
  { key: "ai", name: "Asistente IA", href: "/dashboard/ai", icon: Sparkles },
  { key: "analytics", name: "Analítica", href: "/dashboard/analytics", icon: BarChart3 },
];

// Simula los módulos activos del tenant actual (vendría de tenant_modules en BD)
export function getActiveModulesForTenant(): ModuleManifest[] {
  const enabledKeys: ModuleKey[] = [
    "core",
    "rankflow",
    "crm",
    "projects",
    "finance",
    "support",
    "analytics",
  ];
  return MODULE_REGISTRY.filter((m) => enabledKeys.includes(m.key));
}
