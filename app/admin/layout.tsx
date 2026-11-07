import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { isPlatformAdmin } from "@/lib/platform-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const allowed = await isPlatformAdmin();
  if (!allowed) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
        <Link href="/admin" className="flex items-center gap-2">
          <ShieldCheck size={17} className="text-primary" />
          <span className="text-sm font-semibold">BackOffice Engine — Panel de Plataforma</span>
        </Link>
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
          ← Volver a mi dashboard
        </Link>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
