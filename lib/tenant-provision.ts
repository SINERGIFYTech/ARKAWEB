export const DEFAULT_MODULES = ["core", "rankflow", "crm", "projects", "finance", "support", "automations", "analytics"];

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "org"}-${Math.random().toString(36).slice(2, 6)}`;
}

// Crea la organización con sus roles del sistema y sus módulos por defecto.
// Lo usan el registro público (/signup) y el alta de clientes desde /admin.
// Recibe el cliente admin (service role) porque en este punto aún no existe
// ninguna membresía que permita escribir con RLS.
export async function provisionTenant(
  admin: any,
  input: { companyName: string; status: "TRIAL" | "ACTIVE" }
): Promise<{ tenantId: string; ownerRoleId: string }> {
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name: input.companyName.trim(), slug: slugify(input.companyName), status: input.status })
    .select("id")
    .single();
  if (tenantError || !tenant) throw new Error(tenantError?.message ?? "No se pudo crear la organización.");

  const { data: owner, error: roleError } = await admin
    .from("roles")
    .insert({ tenant_id: tenant.id, name: "Owner", is_system: true })
    .select("id")
    .single();
  if (roleError || !owner) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    throw new Error(roleError?.message ?? "No se pudo crear el rol Owner.");
  }

  await admin.from("roles").insert([
    { tenant_id: tenant.id, name: "Admin", is_system: true },
    { tenant_id: tenant.id, name: "Member", is_system: true },
  ]);
  await admin.from("tenant_modules").insert(DEFAULT_MODULES.map((moduleKey) => ({ tenant_id: tenant.id, module_key: moduleKey })));

  return { tenantId: tenant.id, ownerRoleId: owner.id };
}
