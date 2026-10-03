import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { recordUsageEvent, USAGE_EVENT_TYPES } from "@/lib/usage";
import { runAutomationsForTrigger } from "@/modules/automations/repository";
import { mockDistributors, type DistributorNode } from "@/modules/rankflow/data";
import { DEFAULT_PLAN_CONFIG, normalizeConfig, rankAtLeast, type CompensationPlanConfig } from "@/modules/rankflow/plan-config";
import { calculateAllCommissions, calculateGlobalBonusPool } from "@/modules/rankflow/commission-engine";
import { computeAllQualifications, computeQualifiedRank } from "@/modules/rankflow/rank-engine";
import { getWeekRange, toISODate, weekLabel } from "@/modules/rankflow/period-helpers";

export interface CommissionPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
}

export interface GenealogyData {
  distributors: DistributorNode[];
  isDemo: boolean;
  tenantId: string | null;
  period: CommissionPeriod | null;
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

export async function getOrCreateOpenPeriod(tenantId: string): Promise<CommissionPeriod> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("commission_periods")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "OPEN")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      label: existing.label,
      startDate: existing.start_date,
      endDate: existing.end_date,
      status: existing.status,
    };
  }

  const { start, end } = getWeekRange();
  const { data: created, error } = await supabase
    .from("commission_periods")
    .insert({
      tenant_id: tenantId,
      label: weekLabel(start, end),
      start_date: toISODate(start),
      end_date: toISODate(end),
      status: "OPEN",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: created.id,
    label: created.label,
    startDate: created.start_date,
    endDate: created.end_date,
    status: created.status,
  };
}

export async function getGenealogyData(): Promise<GenealogyData> {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    // Sin Supabase configurado o sin sesión real → modo demo con datos de ejemplo.
    return { distributors: mockDistributors, isDemo: true, tenantId: null, period: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("distributors")
    .select("*")
    .eq("tenant_id", tenantId);

  if (error) {
    // Tabla aún no migrada u otro error de BD → no tumbamos la página, mostramos vacío.
    return { distributors: [], isDemo: false, tenantId, period: null };
  }

  const period = await getOrCreateOpenPeriod(tenantId);

  const { data: entries } = await supabase
    .from("volume_entries")
    .select("distributor_id, amount")
    .eq("tenant_id", tenantId)
    .eq("period_id", period.id);

  const volumeByDistributor = new Map<string, number>();
  for (const e of entries ?? []) {
    volumeByDistributor.set(e.distributor_id, (volumeByDistributor.get(e.distributor_id) ?? 0) + Number(e.amount));
  }

  const distributors = (data ?? []).map((r) => {
    const node = rowToNode(r);
    // El volumen personal del periodo viene de las capturas (volume_entries),
    // no de la columna estática de la tabla distributors.
    node.personalVolume = volumeByDistributor.get(node.id) ?? 0;
    return node;
  });

  return { distributors, isDemo: false, tenantId, period };
}

export async function createDistributor(input: {
  code: string;
  fullName: string;
  email?: string;
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
      email: input.email || null,
      sponsor_id: input.sponsorId,
      placement_parent_id: input.placementParentId,
      placement_leg: input.placementLeg,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await recordUsageEvent(tenantId, USAGE_EVENT_TYPES.DISTRIBUTOR_REGISTERED, 1, { distributorId: data.id });
  await runAutomationsForTrigger(tenantId, "distributor.created", { code: input.code, fullName: input.fullName, rank: "Distribuidor" });

  return data;
}

export async function getVolumeHistoryByPeriod(limit: number = 8): Promise<
  Array<{ periodId: string; label: string; status: "OPEN" | "CLOSED"; totalVolume: number }>
> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const supabase = await createClient();
  const { data: periods } = await supabase
    .from("commission_periods")
    .select("id, label, status, start_date")
    .eq("tenant_id", tenantId)
    .order("start_date", { ascending: false })
    .limit(limit);

  if (!periods || periods.length === 0) return [];

  const periodIds = periods.map((p) => p.id);
  const { data: entries } = await supabase
    .from("volume_entries")
    .select("period_id, amount")
    .eq("tenant_id", tenantId)
    .in("period_id", periodIds);

  const totals = new Map<string, number>();
  for (const e of entries ?? []) {
    totals.set(e.period_id, (totals.get(e.period_id) ?? 0) + Number(e.amount));
  }

  return periods
    .map((p) => ({
      periodId: p.id,
      label: p.label,
      status: p.status as "OPEN" | "CLOSED",
      totalVolume: totals.get(p.id) ?? 0,
    }))
    .reverse(); // orden cronológico para las gráficas
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

  return { config: normalizeConfig(data.config as Partial<CompensationPlanConfig>), isDemo: false };
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

// ---------- RANGOS ----------

export async function applyRankUpdates(updates: Array<{ id: string; rank: string; fullName?: string; oldRank?: string }>) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Base de datos no configurada — conecta Supabase para aplicar rangos reales.");
  }
  if (updates.length === 0) return;

  const supabase = await createClient();
  // Supabase no tiene "bulk update con distintos valores" en una sola query,
  // así que se actualiza uno por uno — para el tamaño típico de un corte esto es rápido.
  for (const u of updates) {
    const { error } = await supabase
      .from("distributors")
      .update({ rank: u.rank })
      .eq("id", u.id)
      .eq("tenant_id", tenantId); // doble candado: RLS + filtro explícito
    if (error) throw new Error(error.message);

    await runAutomationsForTrigger(tenantId, "rank.changed", {
      fullName: u.fullName ?? "",
      oldRank: u.oldRank ?? "",
      newRank: u.rank,
    });
  }
}

// ---------- VOLUMEN DE VENTAS ----------

export interface VolumeEntryRow {
  id: string;
  distributorId: string;
  distributorName: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

export async function addVolumeEntry(input: { distributorId: string; amount: number; note?: string }) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Base de datos no configurada — conecta Supabase para capturar volumen real.");
  }
  if (!(input.amount > 0)) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  const period = await getOrCreateOpenPeriod(tenantId);
  const supabase = await createClient();
  const { error } = await supabase.from("volume_entries").insert({
    tenant_id: tenantId,
    distributor_id: input.distributorId,
    period_id: period.id,
    amount: input.amount,
    note: input.note ?? null,
  });

  if (error) throw new Error(error.message);

  // Cada captura de volumen representa una orden de compra/venta procesada.
  await recordUsageEvent(tenantId, USAGE_EVENT_TYPES.ORDER_PROCESSED, 1, { distributorId: input.distributorId });
}

export async function getVolumeEntriesForOpenPeriod(): Promise<VolumeEntryRow[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const period = await getOrCreateOpenPeriod(tenantId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("volume_entries")
    .select("id, distributor_id, amount, note, created_at, distributors(full_name)")
    .eq("tenant_id", tenantId)
    .eq("period_id", period.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((e: any) => ({
    id: e.id,
    distributorId: e.distributor_id,
    distributorName: e.distributors?.full_name ?? "—",
    amount: Number(e.amount),
    note: e.note,
    createdAt: e.created_at,
  }));
}

// ---------- CIERRE DE PERIODO / HISTORIAL DE CORTES ----------

export interface ClosePeriodResult {
  periodLabel: string;
  distributorsPaid: number;
  totalPaid: number;
  nextPeriodLabel: string;
}

// distributorId -> rangos cuyo bono de bienvenida ya se pagó (para el modo ONE_TIME).
export async function getPaidRankBonuses(): Promise<Record<string, string[]>> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return {};

  const supabase = await createClient();
  const { data } = await supabase.from("rank_bonus_payouts").select("distributor_id, rank").eq("tenant_id", tenantId);

  const map: Record<string, string[]> = {};
  for (const r of data ?? []) {
    (map[r.distributor_id] ??= []).push(r.rank);
  }
  return map;
}

// ---------- INICIO RÁPIDO ----------
// % sobre el volumen capturado a un distribuidor dentro de sus primeros
// windowDays de vida, pagado a quien lo patrocinó. Necesita fechas reales
// (joined_at del distribuidor, created_at de cada captura), por eso vive aquí
// y no en el motor puro.
async function calculateFastStartAmounts(
  tenantId: string,
  periodId: string,
  config: CompensationPlanConfig
): Promise<Record<string, number>> {
  if (!config.fastStart.enabled) return {};

  const supabase = await createClient();

  const [{ data: entries }, { data: distRows }] = await Promise.all([
    supabase.from("volume_entries").select("distributor_id, amount, created_at").eq("tenant_id", tenantId).eq("period_id", periodId),
    supabase.from("distributors").select("id, sponsor_id, joined_at").eq("tenant_id", tenantId),
  ]);

  const distById = new Map((distRows ?? []).map((d) => [d.id, d]));
  const windowMs = config.fastStart.windowDays * 24 * 60 * 60 * 1000;

  const amounts: Record<string, number> = {};
  for (const e of entries ?? []) {
    const dist = distById.get(e.distributor_id);
    if (!dist?.sponsor_id) continue;
    const joinedAt = new Date(dist.joined_at).getTime();
    const capturedAt = new Date(e.created_at).getTime();
    if (capturedAt - joinedAt > windowMs) continue; // fuera de la ventana de inicio rápido

    const credit = Number(e.amount) * config.fastStart.percent;
    amounts[dist.sponsor_id] = (amounts[dist.sponsor_id] ?? 0) + credit;
  }
  return amounts;
}

// ---------- CALIFICACIÓN SOSTENIDA (auto/viaje por rango) ----------
// Actualiza la racha de cada distribuidor para cada regla configurada y
// devuelve cuánto le toca en efectivo este periodo (0 si la regla es "solo
// calificación", como un viaje).
async function processQualificationBonuses(
  tenantId: string,
  distributors: DistributorNode[],
  config: CompensationPlanConfig
): Promise<Record<string, number>> {
  if (config.qualificationBonuses.length === 0) return {};

  const supabase = await createClient();
  const { data: progressRows } = await supabase
    .from("qualification_progress")
    .select("id, distributor_id, rule_id, consecutive_count")
    .eq("tenant_id", tenantId);

  const progressByKey = new Map((progressRows ?? []).map((p) => [`${p.distributor_id}:${p.rule_id}`, p]));
  const amounts: Record<string, number> = {};
  const upserts: any[] = [];

  for (const rule of config.qualificationBonuses) {
    for (const d of distributors) {
      const meetsRank = rankAtLeast(config.ranks, d.rank, rule.minRank);
      const key = `${d.id}:${rule.id}`;
      const existing = progressByKey.get(key);
      const nextCount = meetsRank ? (existing?.consecutive_count ?? 0) + 1 : 0;
      const isQualified = nextCount >= rule.consecutivePeriods;

      upserts.push({
        tenant_id: tenantId,
        distributor_id: d.id,
        rule_id: rule.id,
        rule_name: rule.name,
        consecutive_count: nextCount,
        is_qualified: isQualified,
        updated_at: new Date().toISOString(),
      });

      if (isQualified && rule.cashAmount > 0) {
        amounts[d.id] = (amounts[d.id] ?? 0) + rule.cashAmount;
      }
    }
  }

  if (upserts.length > 0) {
    await supabase.from("qualification_progress").upsert(upserts, { onConflict: "tenant_id,distributor_id,rule_id" });
  }

  return amounts;
}

export async function getQualificationStatus(): Promise<
  Array<{ distributorId: string; distributorName: string; ruleId: string; ruleName: string; consecutiveCount: number; isQualified: boolean }>
> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("qualification_progress")
    .select("distributor_id, rule_id, rule_name, consecutive_count, is_qualified, distributors(full_name)")
    .eq("tenant_id", tenantId)
    .order("rule_name");

  return (data ?? []).map((r: any) => ({
    distributorId: r.distributor_id,
    distributorName: r.distributors?.full_name ?? "—",
    ruleId: r.rule_id,
    ruleName: r.rule_name,
    consecutiveCount: r.consecutive_count,
    isQualified: r.is_qualified,
  }));
}

export async function closeOpenPeriod(): Promise<ClosePeriodResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Base de datos no configurada — conecta Supabase para cerrar periodos reales.");
  }

  const [{ distributors, period }, { config }] = await Promise.all([getGenealogyData(), getCompensationPlan()]);
  if (!period) throw new Error("No hay un periodo abierto.");
  if (distributors.length === 0) throw new Error("No hay distribuidores para calcular.");

  const supabase = await createClient();

  // 1. Congelar el cálculo de comisiones de este periodo.
  const paidRankBonuses = await getPaidRankBonuses();
  const [fastStartAmounts, qualificationAmounts] = await Promise.all([
    calculateFastStartAmounts(tenantId, period.id, config),
    processQualificationBonuses(tenantId, distributors, config),
  ]);
  const results = calculateAllCommissions(distributors, config, { paidRankBonuses, fastStartAmounts, qualificationAmounts });
  const rows = results
    .filter((r) => r.total > 0)
    .map((r) => ({
      tenant_id: tenantId,
      period_id: period.id,
      distributor_id: r.distributor.id,
      rank: r.distributor.rank,
      binary_amount: r.binary.capped,
      unilevel_amount: r.unilevel.total,
      generation_amount: r.generation.total,
      rank_bonus_amount: r.rankBonus.amount,
      matching_bonus_amount: r.matching.total,
      fast_start_amount: r.fastStart,
      global_bonus_amount: r.globalBonus,
      qualification_bonus_amount: r.qualificationBonus,
      total_amount: r.total,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("commission_runs").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  // Bonos de bienvenida (ONE_TIME): dejar constancia para no volver a pagarlos.
  if (config.rankBonus.enabled && config.rankBonus.mode === "ONE_TIME") {
    const payouts = results
      .filter((r) => r.rankBonus.amount > 0)
      .map((r) => ({
        tenant_id: tenantId,
        distributor_id: r.distributor.id,
        rank: r.rankBonus.rank,
        period_id: period.id,
        amount: r.rankBonus.amount,
      }));
    if (payouts.length > 0) {
      const { error: payoutError } = await supabase
        .from("rank_bonus_payouts")
        .upsert(payouts, { onConflict: "tenant_id,distributor_id,rank", ignoreDuplicates: true });
      if (payoutError) throw new Error(payoutError.message);
    }
  }

  await recordUsageEvent(tenantId, USAGE_EVENT_TYPES.COMMISSION_RUN, distributors.length, { periodId: period.id });

  // 2. Aplicar los rangos que corresponden por el volumen de este periodo, de cara al siguiente.
  const qualifications = computeAllQualifications(distributors, config);
  const rankUpdates = qualifications
    .filter((q) => !q.matches)
    .map((q) => ({ id: q.distributor.id, rank: q.qualifiedRank, fullName: q.distributor.fullName, oldRank: q.currentRank }));
  if (rankUpdates.length > 0) {
    await applyRankUpdates(rankUpdates);
  }

  // 3. Cerrar el periodo actual.
  const { error: closeError } = await supabase
    .from("commission_periods")
    .update({ status: "CLOSED", closed_at: new Date().toISOString() })
    .eq("id", period.id)
    .eq("tenant_id", tenantId);
  if (closeError) throw new Error(closeError.message);

  // 4. Abrir el siguiente periodo (semana siguiente a la que se acaba de cerrar).
  const nextStart = new Date(period.endDate);
  nextStart.setDate(nextStart.getDate() + 1);
  const { start, end } = getWeekRange(nextStart);
  const nextLabel = weekLabel(start, end);

  const { error: nextError } = await supabase.from("commission_periods").insert({
    tenant_id: tenantId,
    label: nextLabel,
    start_date: toISODate(start),
    end_date: toISODate(end),
    status: "OPEN",
  });
  if (nextError) throw new Error(nextError.message);

  const result = {
    periodLabel: period.label,
    distributorsPaid: rows.length,
    totalPaid: rows.reduce((sum, r) => sum + r.total_amount, 0),
    nextPeriodLabel: nextLabel,
  };

  await runAutomationsForTrigger(tenantId, "period.closed", result);

  return result;
}

export interface CommissionHistoryPeriod {
  id: string;
  label: string;
  closedAt: string | null;
  distributorsPaid: number;
  totalPaid: number;
}

export async function getCommissionHistory(): Promise<CommissionHistoryPeriod[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const supabase = await createClient();
  const { data: periods } = await supabase
    .from("commission_periods")
    .select("id, label, closed_at")
    .eq("tenant_id", tenantId)
    .eq("status", "CLOSED")
    .order("closed_at", { ascending: false });

  if (!periods || periods.length === 0) return [];

  const { data: runs } = await supabase
    .from("commission_runs")
    .select("period_id, total_amount")
    .eq("tenant_id", tenantId);

  return periods.map((p) => {
    const periodRuns = (runs ?? []).filter((r) => r.period_id === p.id);
    return {
      id: p.id,
      label: p.label,
      closedAt: p.closed_at,
      distributorsPaid: periodRuns.length,
      totalPaid: periodRuns.reduce((sum, r) => sum + Number(r.total_amount), 0),
    };
  });
}

export interface CommissionRunDetail {
  distributorId: string;
  distributorName: string;
  rank: string;
  binaryAmount: number;
  unilevelAmount: number;
  generationAmount: number;
  rankBonusAmount: number;
  matchingBonusAmount: number;
  fastStartAmount: number;
  globalBonusAmount: number;
  qualificationBonusAmount: number;
  totalAmount: number;
}

export async function getCommissionRunDetail(periodId: string): Promise<{ label: string; runs: CommissionRunDetail[] }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { label: "", runs: [] };

  const supabase = await createClient();
  const { data: period } = await supabase
    .from("commission_periods")
    .select("label")
    .eq("id", periodId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("commission_runs")
    .select("distributor_id, rank, binary_amount, unilevel_amount, generation_amount, rank_bonus_amount, matching_bonus_amount, fast_start_amount, global_bonus_amount, qualification_bonus_amount, total_amount, distributors(full_name)")
    .eq("tenant_id", tenantId)
    .eq("period_id", periodId)
    .order("total_amount", { ascending: false });

  if (error || !data) return { label: period?.label ?? "", runs: [] };

  return {
    label: period?.label ?? "",
    runs: data.map((r: any) => ({
      distributorId: r.distributor_id,
      distributorName: r.distributors?.full_name ?? "—",
      rank: r.rank,
      binaryAmount: Number(r.binary_amount),
      unilevelAmount: Number(r.unilevel_amount),
      generationAmount: Number(r.generation_amount),
      rankBonusAmount: Number(r.rank_bonus_amount ?? 0),
      matchingBonusAmount: Number(r.matching_bonus_amount ?? 0),
      fastStartAmount: Number(r.fast_start_amount ?? 0),
      globalBonusAmount: Number(r.global_bonus_amount ?? 0),
      qualificationBonusAmount: Number(r.qualification_bonus_amount ?? 0),
      totalAmount: Number(r.total_amount),
    })),
  };
}

// ---------- BONO DECEMBRINO (anual, manual) ----------
// No corre en cada cierre de periodo semanal — es una herramienta aparte que
// se corre una vez al año sobre el volumen acumulado de todo el año.

async function getDistributorsWithVolumeForYear(tenantId: string, year: number): Promise<DistributorNode[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("distributors").select("*").eq("tenant_id", tenantId);
  if (!rows) return [];

  const start = new Date(Date.UTC(year, 0, 1)).toISOString();
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();

  const { data: entries } = await supabase
    .from("volume_entries")
    .select("distributor_id, amount")
    .eq("tenant_id", tenantId)
    .gte("created_at", start)
    .lte("created_at", end);

  const volumeByDistributor = new Map<string, number>();
  for (const e of entries ?? []) {
    volumeByDistributor.set(e.distributor_id, (volumeByDistributor.get(e.distributor_id) ?? 0) + Number(e.amount));
  }

  return rows.map((r) => {
    const node = rowToNode(r);
    node.personalVolume = volumeByDistributor.get(node.id) ?? 0;
    return node;
  });
}

export interface ChristmasBonusPreviewRow {
  distributorId: string;
  fullName: string;
  baseVolume: number;
  amount: number;
}

export async function previewChristmasBonus(year: number): Promise<{ config: CompensationPlanConfig; rows: ChristmasBonusPreviewRow[] }> {
  const tenantId = await getCurrentTenantId();
  const { config } = await getCompensationPlan();
  if (!tenantId || !config.christmasBonus.enabled) return { config, rows: [] };

  const distributors = await getDistributorsWithVolumeForYear(tenantId, year);

  const rows = distributors.map((d) => {
    const baseVolume =
      config.christmasBonus.basedOn === "TEAM" ? getSponsorSubtreeVolumeForYear(distributors, d.id) : d.personalVolume;
    return { distributorId: d.id, fullName: d.fullName, baseVolume, amount: baseVolume * config.christmasBonus.percent };
  });

  return { config, rows: rows.filter((r) => r.amount > 0) };
}

// Copia local de getSponsorSubtreeVolume para no importar el árbol de comisiones
// (aquí trabajamos con volumen anual, no el de un periodo).
function getSponsorSubtreeVolumeForYear(distributors: DistributorNode[], id: string): number {
  const node = distributors.find((d) => d.id === id);
  if (!node) return 0;
  const children = distributors.filter((d) => d.sponsorId === id);
  return node.personalVolume + children.reduce((sum, c) => sum + getSponsorSubtreeVolumeForYear(distributors, c.id), 0);
}

export async function payChristmasBonus(year: number): Promise<{ paid: number; totalAmount: number }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada.");

  const { rows } = await previewChristmasBonus(year);
  if (rows.length === 0) return { paid: 0, totalAmount: 0 };

  const supabase = await createClient();
  const payload = rows.map((r) => ({
    tenant_id: tenantId,
    year,
    distributor_id: r.distributorId,
    base_volume: r.baseVolume,
    amount: r.amount,
  }));

  const { error } = await supabase
    .from("christmas_bonus_runs")
    .upsert(payload, { onConflict: "tenant_id,distributor_id,year", ignoreDuplicates: true });
  if (error) throw new Error(error.message);

  return { paid: rows.length, totalAmount: rows.reduce((sum, r) => sum + r.amount, 0) };
}

export interface ChristmasBonusHistoryRow {
  fullName: string;
  baseVolume: number;
  amount: number;
  paidAt: string;
}

export async function getChristmasBonusHistory(year: number): Promise<ChristmasBonusHistoryRow[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("christmas_bonus_runs")
    .select("base_volume, amount, paid_at, distributors(full_name)")
    .eq("tenant_id", tenantId)
    .eq("year", year)
    .order("amount", { ascending: false });

  return (data ?? []).map((r: any) => ({
    fullName: r.distributors?.full_name ?? "—",
    baseVolume: Number(r.base_volume),
    amount: Number(r.amount),
    paidAt: r.paid_at,
  }));
}

// ---------- LISTA PLANA DE DISTRIBUIDORES (admin) ----------

export interface DistributorListRow {
  id: string;
  code: string;
  fullName: string;
  email: string | null;
  rank: string;
  status: "ACTIVE" | "INACTIVE";
  hasPortalAccess: boolean;
}

export async function getDistributorList(): Promise<{ rows: DistributorListRow[]; isDemo: boolean }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return {
      rows: mockDistributors.map((d) => ({ id: d.id, code: d.code, fullName: d.fullName, email: null, rank: d.rank, status: d.status, hasPortalAccess: false })),
      isDemo: true,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("distributors")
    .select("id, code, full_name, email, rank, status, user_id")
    .eq("tenant_id", tenantId)
    .order("full_name");

  return {
    rows: (data ?? []).map((d) => ({
      id: d.id,
      code: d.code,
      fullName: d.full_name,
      email: d.email,
      rank: d.rank,
      status: d.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      hasPortalAccess: !!d.user_id,
    })),
    isDemo: false,
  };
}
