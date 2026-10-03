import { NextResponse } from "next/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return NextResponse.json({ error: "Base de datos no configurada." }, { status: 400 });

    const { distributorId, email } = await request.json();
    if (!distributorId || !email) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const admin = createAdminClient();

    const { data: distributor } = await admin
      .from("distributors")
      .select("id, full_name, user_id")
      .eq("id", distributorId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!distributor) return NextResponse.json({ error: "Distribuidor no encontrado" }, { status: 404 });
    if (distributor.user_id) return NextResponse.json({ error: "Este distribuidor ya tiene acceso al portal" }, { status: 400 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/portal/accept-invite`,
    });

    if (inviteError || !invited.user) {
      return NextResponse.json({ error: inviteError?.message ?? "No se pudo enviar la invitación" }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("distributors")
      .update({ email, user_id: invited.user.id })
      .eq("id", distributorId)
      .eq("tenant_id", tenantId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
