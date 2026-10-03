import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenantId } from "@/lib/tenant";
import { sendEmail } from "@/modules/automations/email";
import {
  evaluateConditions,
  interpolate,
  type AutomationRule,
  type TriggerType,
  type AutomationAction,
} from "@/modules/automations/types";

// ---------- CRUD ----------

export async function getAutomationRules(): Promise<{ rules: AutomationRule[]; isDemo: boolean }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { rules: [], isDemo: true };

  const supabase = await createClient();
  const { data } = await supabase
    .from("automation_rules")
    .select("id, name, trigger_type, is_enabled, conditions, actions")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return {
    rules: (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      triggerType: r.trigger_type,
      isEnabled: r.is_enabled,
      conditions: r.conditions ?? [],
      actions: r.actions ?? [],
    })),
    isDemo: false,
  };
}

export async function createAutomationRule(input: Omit<AutomationRule, "id">) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada.");

  const supabase = await createClient();
  const { error } = await supabase.from("automation_rules").insert({
    tenant_id: tenantId,
    name: input.name,
    trigger_type: input.triggerType,
    is_enabled: input.isEnabled,
    conditions: input.conditions,
    actions: input.actions,
  });

  if (error) throw new Error(error.message);
}

export async function updateAutomationRule(id: string, patch: Partial<Omit<AutomationRule, "id">>) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada.");

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.triggerType !== undefined) row.trigger_type = patch.triggerType;
  if (patch.isEnabled !== undefined) row.is_enabled = patch.isEnabled;
  if (patch.conditions !== undefined) row.conditions = patch.conditions;
  if (patch.actions !== undefined) row.actions = patch.actions;

  const supabase = await createClient();
  const { error } = await supabase.from("automation_rules").update(row).eq("id", id).eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}

export async function deleteAutomationRule(id: string) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada.");

  const supabase = await createClient();
  const { error } = await supabase.from("automation_rules").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export interface AutomationRunLog {
  id: string;
  ruleName: string;
  triggerType: string;
  status: "SUCCESS" | "ERROR" | "SKIPPED";
  detail: string | null;
  createdAt: string;
}

export async function getAutomationRuns(limit: number = 30): Promise<AutomationRunLog[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("automation_runs")
    .select("id, rule_name, trigger_type, status, detail, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id,
    ruleName: r.rule_name,
    triggerType: r.trigger_type,
    status: r.status,
    detail: r.detail,
    createdAt: r.created_at,
  }));
}

// ---------- MOTOR DE EJECUCIÓN ----------
// Se llama de forma síncrona, en el mismo request, justo después del evento real
// (alta de distribuidor, ticket creado, etc.). No hay cola ni cron — corre inline.

async function executeAction(tenantId: string, action: AutomationAction, payload: Record<string, unknown>): Promise<string> {
  const admin = createAdminClient();

  switch (action.type) {
    case "notification.create": {
      const title = interpolate(action.config.title ?? "", payload);
      const body = interpolate(action.config.body ?? "", payload);
      // Notificación va a nivel tenant (sin user_id específico = visible para el equipo);
      // la tabla notifications requiere user_id, así que se manda al Owner.
      const { data: owner } = await admin
        .from("tenant_users")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();
      if (owner?.user_id) {
        await admin.from("notifications").insert({ tenant_id: tenantId, user_id: owner.user_id, title, body });
      }
      return `Notificación creada: "${title}"`;
    }

    case "webhook.call": {
      const url = action.config.url;
      if (!url) return "Sin URL configurada";
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: payload }),
          signal: AbortSignal.timeout(8000),
        });
        return `POST ${url} → ${res.status}`;
      } catch (err) {
        const message = err instanceof Error ? err.message : "error desconocido";
        throw new Error(`Webhook falló: ${message}`);
      }
    }

    case "email.send": {
      const to = interpolate(action.config.to ?? "", payload);
      const subject = interpolate(action.config.subject ?? "", payload);
      const body = interpolate(action.config.body ?? "", payload);
      const result = await sendEmail({ to, subject, body });
      if (!result.sent) throw new Error(result.detail);
      return result.detail;
    }

    default:
      return "Acción desconocida";
  }
}

export async function runAutomationsForTrigger(tenantId: string, triggerType: TriggerType, payload: Record<string, unknown>) {
  try {
    const admin = createAdminClient();
    const { data: rules } = await admin
      .from("automation_rules")
      .select("id, name, conditions, actions")
      .eq("tenant_id", tenantId)
      .eq("trigger_type", triggerType)
      .eq("is_enabled", true);

    for (const rule of rules ?? []) {
      const conditions = rule.conditions ?? [];
      const actions: AutomationAction[] = rule.actions ?? [];

      if (!evaluateConditions(conditions, payload)) {
        await admin.from("automation_runs").insert({
          tenant_id: tenantId,
          rule_id: rule.id,
          rule_name: rule.name,
          trigger_type: triggerType,
          status: "SKIPPED",
          detail: "No cumplió las condiciones",
          payload,
        });
        continue;
      }

      try {
        const details: string[] = [];
        for (const action of actions) {
          details.push(await executeAction(tenantId, action, payload));
        }
        await admin.from("automation_runs").insert({
          tenant_id: tenantId,
          rule_id: rule.id,
          rule_name: rule.name,
          trigger_type: triggerType,
          status: "SUCCESS",
          detail: details.join(" · "),
          payload,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        await admin.from("automation_runs").insert({
          tenant_id: tenantId,
          rule_id: rule.id,
          rule_name: rule.name,
          trigger_type: triggerType,
          status: "ERROR",
          detail: message,
          payload,
        });
      }
    }
  } catch {
    // Las automatizaciones nunca deben tumbar la acción real del usuario (crear
    // distribuidor, cerrar periodo, etc.) — best-effort, igual que recordUsageEvent.
  }
}
