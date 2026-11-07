import { createAdminClient } from "@/lib/supabase/admin";
import { computeBilling, getCurrentBillingPeriod, type TenantBilling } from "@/modules/platform/billing";
import { USAGE_EVENT_TYPES } from "@/lib/usage";
import { provisionTenant } from "@/lib/tenant-provision";
import { getSiteUrl } from "@/lib/site-url";

export interface TenantUsageSummary {
  tenantId: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  billing: TenantBilling;
}

// SOLO llamar desde rutas/páginas que ya verificaron isPlatformAdmin() — esta
// función usa el service role key y no respeta RLS por diseño (necesita ver
// todos los tenants para poder facturarlos).
export async function listTenantsWithUsage(): Promise<{ periodLabel: string; tenants: TenantUsageSummary[] }> {
  const { start, end, label } = getCurrentBillingPeriod();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { periodLabel: label, tenants: [] };
  }
  const admin = createAdminClient();

  const { data: tenants, error: tenantsError } = await admin
    .from("tenants")
    .select("id, name, slug, status, created_at")
    .order("created_at", { ascending: false });

  if (tenantsError || !tenants) return { periodLabel: label, tenants: [] };

  const { data: events } = await admin
    .from("usage_events")
    .select("tenant_id, quantity")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  const usageByTenant = new Map<string, number>();
  for (const e of events ?? []) {
    usageByTenant.set(e.tenant_id, (usageByTenant.get(e.tenant_id) ?? 0) + Number(e.quantity));
  }

  const summaries: TenantUsageSummary[] = tenants.map((t) => ({
    tenantId: t.id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    createdAt: t.created_at,
    billing: computeBilling(usageByTenant.get(t.id) ?? 0),
  }));

  return { periodLabel: label, tenants: summaries };
}

export interface UsageByType {
  eventType: string;
  quantity: number;
}

export async function getTenantUsageDetail(tenantId: string): Promise<{
  tenant: { name: string; slug: string; status: string } | null;
  periodLabel: string;
  billing: TenantBilling;
  byType: UsageByType[];
}> {
  const { start, end, label } = getCurrentBillingPeriod();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { tenant: null, periodLabel: label, billing: computeBilling(0), byType: [] };
  }
  const admin = createAdminClient();

  const { data: tenant } = await admin.from("tenants").select("name, slug, status").eq("id", tenantId).maybeSingle();

  const { data: events } = await admin
    .from("usage_events")
    .select("event_type, quantity")
    .eq("tenant_id", tenantId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  const totals = new Map<string, number>();
  for (const key of Object.values(USAGE_EVENT_TYPES)) totals.set(key, 0);
  let grandTotal = 0;
  for (const e of events ?? []) {
    totals.set(e.event_type, (totals.get(e.event_type) ?? 0) + Number(e.quantity));
    grandTotal += Number(e.quantity);
  }

  return {
    tenant: tenant ?? null,
    periodLabel: label,
    billing: computeBilling(grandTotal),
    byType: Array.from(totals.entries()).map(([eventType, quantity]) => ({ eventType, quantity })),
  };
}

// ---------- MÓDULOS POR CLIENTE ----------

export interface TenantModuleRow {
  key: string;
  name: string;
  isCore: boolean;
  isEnabled: boolean;
}

// Catálogo completo cruzado con lo que este tenant tiene encendido.
// Un módulo sin fila en tenant_modules cuenta como apagado.
export async function getTenantModules(tenantId: string): Promise<TenantModuleRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const admin = createAdminClient();

  const [{ data: catalog }, { data: rows }] = await Promise.all([
    admin.from("modules").select("key, name, is_core").order("name"),
    admin.from("tenant_modules").select("module_key, is_enabled").eq("tenant_id", tenantId),
  ]);

  const enabled = new Map<string, boolean>();
  for (const r of rows ?? []) enabled.set(r.module_key, r.is_enabled);

  return (catalog ?? []).map((m) => ({
    key: m.key,
    name: m.name,
    isCore: m.is_core,
    isEnabled: m.is_core ? true : enabled.get(m.key) ?? false,
  }));
}

export async function setTenantModule(tenantId: string, moduleKey: string, isEnabled: boolean) {
  const admin = createAdminClient();

  const { data: mod } = await admin.from("modules").select("is_core").eq("key", moduleKey).maybeSingle();
  if (!mod) throw new Error("Módulo no existe en el catálogo.");
  if (mod.is_core) throw new Error("El módulo Core no se puede apagar.");

  const { error } = await admin
    .from("tenant_modules")
    .upsert({ tenant_id: tenantId, module_key: moduleKey, is_enabled: isEnabled }, { onConflict: "tenant_id,module_key" });

  if (error) throw new Error(error.message);
}

// ---------- ALTA DE CLIENTES ----------
// El superadmin crea la organización de un cliente nuevo e invita a su dueño por
// correo; el dueño entra por /accept-invite, pone su contraseña y queda como Owner.
export async function createClientTenant(input: { companyName: string; ownerEmail: string }): Promise<{ tenantId: string }> {
  const companyName = input.companyName.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  if (companyName.length < 2) throw new Error("Escribe el nombre de la empresa.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw new Error("Escribe un correo válido para el dueño.");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Base de datos no configurada.");
  }

  const admin = createAdminClient();
  const { tenantId, ownerRoleId } = await provisionTenant(admin, { companyName, status: "ACTIVE" });

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(ownerEmail, {
    redirectTo: `${getSiteUrl()}/accept-invite`,
  });
  if (inviteError || !invited.user) {
    await admin.from("tenants").delete().eq("id", tenantId); // no dejar organizaciones huérfanas
    throw new Error(
      inviteError?.message?.toLowerCase().includes("already")
        ? "Ese correo ya tiene una cuenta. Usa otro correo para el dueño de este cliente."
        : inviteError?.message ?? "No se pudo enviar la invitación."
    );
  }

  await admin.from("users").upsert({ id: invited.user.id, email: ownerEmail });
  const { error: membershipError } = await admin.from("tenant_users").insert({
    tenant_id: tenantId,
    user_id: invited.user.id,
    role_id: ownerRoleId,
    status: "INVITED",
  });
  if (membershipError) {
    await admin.from("tenants").delete().eq("id", tenantId);
    throw new Error(membershipError.message);
  }

  return { tenantId };
}
