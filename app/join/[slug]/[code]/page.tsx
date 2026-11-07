import { Building2 } from "lucide-react";
import { getJoinContext } from "@/modules/store/public-repository";
import { JoinForm } from "@/modules/store/join-form";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; code: string }>;
  searchParams: Promise<{ leg?: string }>;
}) {
  const raw = await params;
  const slug = decodeURIComponent(raw.slug);
  const code = decodeURIComponent(raw.code);
  const { leg: legParam } = await searchParams;
  const ctx = await getJoinContext(slug, code);
  const leg = legParam === "left" ? "LEFT" : legParam === "right" ? "RIGHT" : null;

  return (
    <div className="surface-dark flex min-h-screen items-center justify-center px-4 py-10">
      <div className="animate-fade-up w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="surface-gradient stat-glow flex h-10 w-10 items-center justify-center rounded-xl"><Building2 size={20} /></div>
          <span className="text-base font-bold tracking-tight text-white">{ctx?.companyName ?? "Registro"}</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card p-6 shadow-2xl">
          {!ctx ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold">Este link no es válido</h1>
              <p className="mt-2 text-sm text-muted-foreground">Pídele a quien te lo compartió que te envíe su link de registro otra vez.</p>
            </div>
          ) : ctx.packages.length === 0 ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold">Registro no disponible</h1>
              <p className="mt-2 text-sm text-muted-foreground">Por ahora esta empresa no tiene paquetes de inscripción disponibles.</p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold">Únete a {ctx.companyName}</h1>
              <p className="mb-5 mt-1 text-sm text-muted-foreground">Te invita <strong>{ctx.sponsorName}</strong>.</p>
              <JoinForm slug={slug} code={code} leg={ctx.binaryEnabled ? leg : null} packages={ctx.packages} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
