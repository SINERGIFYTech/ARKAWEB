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
      <div className="surface-dark px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="stat-glow flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-base font-bold backdrop-blur">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fullName}</p>
            <p className="text-[11px] text-white/60">ID: {code}</p>
          </div>
        </div>
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
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "surface-gradient shadow-md"
                  : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon size={17} className="shrink-0 transition-transform group-hover:scale-110" />
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
