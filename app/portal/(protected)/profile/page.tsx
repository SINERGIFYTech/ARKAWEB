import { getCurrentDistributor } from "@/lib/distributor-auth";

export default async function PortalProfilePage() {
  const distributor = await getCurrentDistributor();
  if (!distributor) return null;

  return (
    <div className="max-w-md space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Mi Perfil</h1>
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div>
          <p className="text-xs text-muted-foreground">Nombre</p>
          <p className="text-sm font-medium">{distributor.fullName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">ID de distribuidor</p>
          <p className="text-sm font-medium">{distributor.code}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Rango actual</p>
          <p className="text-sm font-medium">{distributor.rank}</p>
        </div>
      </div>
    </div>
  );
}
