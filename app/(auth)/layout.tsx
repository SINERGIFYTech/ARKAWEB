import { Building2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-dark flex min-h-screen items-center justify-center px-4">
      <div className="animate-fade-up w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="surface-gradient stat-glow flex h-10 w-10 items-center justify-center rounded-xl">
            <Building2 size={20} />
          </div>
          <span className="text-base font-bold tracking-tight text-white">BackOffice Engine</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card p-6 shadow-2xl">{children}</div>
      </div>
    </div>
  );
}
