import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { setTenantModule } from "@/modules/platform/admin-repository";

// /api/admin no pasa por la protección de /admin del middleware, así que el
// chequeo de platform admin es obligatorio aquí, dentro del propio endpoint.
export async function PATCH(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const { tenantId } = await params;
    const { moduleKey, isEnabled } = await request.json();
    await setTenantModule(tenantId, moduleKey, !!isEnabled);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
