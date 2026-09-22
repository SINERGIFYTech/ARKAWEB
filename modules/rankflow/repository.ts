import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { mockDistributors, type DistributorNode } from "@/modules/rankflow/data";
import { DEFAULT_PLAN_CONFIG, type CompensationPlanConfig } from "@/modules/rankflow/plan-config";

export interface GenealogyData {
  distributors: DistributorNode[];
  isDemo: boolean;
  tenantId: string | null;
}

interface DistributorRow {
  id: string;
  code: string;
  full_name: string;
  rank: string;
  personal_volume: number | string;
  status: string;
  sponsor_id: string | null;
  placement_parent_id: string | null;
  placement_leg: "LEFT" | "RIGHT" | null;
}

function rowToNode(r: DistributorRow): DistributorNode {
  return {
    id: r.id,
    code: r.code,
    fullName: r.full_name,
    rank: r.rank,
    personalVolume: Number(r.personal_volume),
    status: r.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    sponsorId: r.sponsor_id,
    placementParentId: r.placement_parent_id,
    placementLeg: r.placement_leg,
  };
}

export async function getGenealogyData(): Promise<GenealogyData> {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    // Sin Supabase configurado o sin sesión real → modo demo con datos de ejemplo.
    return { distributors: mockDistributors, isDemo: true, tenantId: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("distributors")
    .select("*")
    .eq("tenant_id", tenantId);

  if (error) {
    // Tabla aún no migrada u otro error de BD → no tumbamos la página, mostramos vacío.
    return { distributors: [], isDemo: false, tenantId };
  }

  return { distributors: (data ?? []).map(rowToNode), isDemo: false, tenantId };
}

export async function createDistributor(input: {
  code: string;
  fullName: string;
  sponsorId: string | null;
  placementParentId: string | null;
  placementLeg: "LEFT" | "RIGHT" | null;
}) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Base de datos no configurada — conecta Supabase para dar de alta distribuidores reales.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("distributors")
    .insert({
      tenant_id: tenantId,
      code: input.code,
      full_name: input.fullName,
      sponsor_id: input.sponsorId,
      placement_parent_id: input.placementParentId,
      placement_leg: input.placementLeg,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ---------- PLAN DE COMPENSACIÓN ----------

export interface PlanData {
  config: CompensationPlanConfig;
  isDemo: boolean;
}

export async function getCompensationPlan(): Promise<PlanData> {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    return { config: DEFAULT_PLAN_CONFIG, isDemo: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compensation_plans")
    .select("config")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) {
    // Tenant real sin plan configurado todavía → default como punto de partida editable.
    return { config: DEFAULT_PLAN_CONFIG, isDemo: false };
  }

  return { config: data.config as CompensationPlanConfig, isDemo: false };
}

export async function saveCompensationPlan(config: CompensationPlanConfig) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Base de datos no configurada — conecta Supabase para guardar el plan de compensación.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("compensation_plans")
    .upsert({ tenant_id: tenantId, config, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
}
