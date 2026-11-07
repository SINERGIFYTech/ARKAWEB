import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createClientTenant } from "@/modules/platform/admin-repository";

// /api/admin no pasa por la protección de /admin del middleware: el chequeo de
// platform admin es obligatorio aquí, dentro del propio endpoint.
export async function POST(request: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const { companyName, ownerEmail } = await request.json();
    const result = await createClientTenant({ companyName: String(companyName ?? ""), ownerEmail: String(ownerEmail ?? "") });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 400 });
  }
}
