import { createAdminClient } from "@/lib/supabase/admin";
import { computeBilling, getCurrentBillingPeriod, type TenantBilling } from "@/modules/platform/billing";
import { USAGE_EVENT_TYPES } from "@/lib/usage";

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
