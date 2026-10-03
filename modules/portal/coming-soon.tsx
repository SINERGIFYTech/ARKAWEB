import type { LucideIcon } from "lucide-react";

export function ComingSoon({ title, icon: Icon, description }: { title: string; icon: LucideIcon; description: string }) {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-16 text-center">
        <Icon size={28} className="text-muted-foreground" />
        <p className="text-sm font-medium">Próximamente</p>
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
