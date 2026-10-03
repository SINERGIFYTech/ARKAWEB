"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserCircle,
  ShoppingCart,
  Users2,
  DollarSign,
  Download,
  UserSquare2,
  GraduationCap,
  Gift,
  FileText,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const items = [
  { name: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { name: "Mi Perfil", href: "/portal/profile", icon: UserCircle },
  { name: "Tienda", href: "/portal/shop", icon: ShoppingCart },
  { name: "Mi Equipo", href: "/portal/team", icon: Users2 },
  { name: "Ganancias", href: "/portal/earnings", icon: DollarSign },
  { name: "Retiros", href: "/portal/withdrawal", icon: Download },
  { name: "Clientes", href: "/portal/customers", icon: UserSquare2 },
  { name: "Quick Coach", href: "/portal/coach", icon: GraduationCap },
  { name: "Incentivos", href: "/portal/incentives", icon: Gift },
  { name: "Herramientas de Marketing", href: "/portal/marketing", icon: FileText },
  { name: "Centro de Ayuda", href: "/portal/help", icon: HelpCircle },
];

export function PortalSidebar({ fullName, code }: { fullName: string; code: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/portal/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-semibold">{fullName}</p>
        <p className="text-xs text-muted-foreground">ID: {code}</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={17} className="shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LogOut size={16} /> Cerrar sesión
      </button>
    </aside>
  );
}
