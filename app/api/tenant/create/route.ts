import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionTenant } from "@/lib/tenant-provision";

export async function POST(request: Request) {
  const { userId, email, companyName } = await request.json();

  if (!userId || !companyName) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { tenantId, ownerRoleId } = await provisionTenant(admin, { companyName, status: "TRIAL" });

    await admin.from("users").upsert({ id: userId, email });

    const { error: membershipError } = await admin.from("tenant_users").insert({
      tenant_id: tenantId,
      user_id: userId,
      role_id: ownerRoleId,
      status: "ACTIVE",
    });
    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    return NextResponse.json({ tenant: { id: tenantId } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 500 });
  }
}
