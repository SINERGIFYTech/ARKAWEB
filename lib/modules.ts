import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";

// En modo demo (sin Supabase / sin sesión real) se muestran todos los módulos construidos.
const DEMO_ENABLED = ["core", "rankflow", "crm", "projects", "finance", "support", "automations", "analytics"];

// Fuente de verdad: tabla tenant_modules. "core" siempre está activo.
export async function getEnabledModuleKeys(): Promise<string[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return DEMO_ENABLED;

  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_modules")
    .select("module_key, is_enabled")
    .eq("tenant_id", tenantId);

  const keys = (data ?? []).filter((r) => r.is_enabled).map((r) => r.module_key as string);
  return Array.from(new Set(["core", ...keys]));
}

// Se usa en el layout de cada módulo: si el superadmin lo apagó para este
// cliente, entrar por URL directa también redirige (no basta con ocultar el menú).
export async function requireModule(moduleKey: string) {
  const keys = await getEnabledModuleKeys();
  if (!keys.includes(moduleKey)) redirect("/dashboard");
}
