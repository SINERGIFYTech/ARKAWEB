import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { userId, email, companyName } = await request.json();

  if (!userId || !companyName) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const slug = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .concat("-", Math.random().toString(36).slice(2, 6));

  // 1. Crear tenant
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name: companyName, slug, status: "TRIAL" })
    .select()
    .single();

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 500 });
  }

  // 2. Asegurar que el usuario exista en la tabla `users` (perfil)
  await admin.from("users").upsert({ id: userId, email });

  // 3. Crear rol "Owner" del sistema para este tenant
  const { data: role, error: roleError } = await admin
    .from("roles")
    .insert({ tenant_id: tenant.id, name: "Owner", is_system: true })
    .select()
    .single();

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }

  // 4. Vincular usuario ↔ tenant ↔ rol
  const { error: membershipError } = await admin.from("tenant_users").insert({
    tenant_id: tenant.id,
    user_id: userId,
    role_id: role.id,
    status: "ACTIVE",
  });

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  // 5. Activar módulos por defecto del plan gratuito
  const defaultModules = ["core", "rankflow", "crm", "projects", "finance", "support", "analytics"];
  await admin
    .from("tenant_modules")
    .insert(defaultModules.map((moduleKey) => ({ tenant_id: tenant.id, module_key: moduleKey })));

  return NextResponse.json({ tenant });
}
