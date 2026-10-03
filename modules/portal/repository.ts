import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentDistributor } from "@/lib/distributor-auth";
import { DEFAULT_PLAN_CONFIG, normalizeConfig, type CompensationPlanConfig } from "@/modules/rankflow/plan-config";
import { computeQualifiedRank } from "@/modules/rankflow/rank-engine";
import { getLegVolume, getPlacementChildren, getSponsoredChildren, type DistributorNode } from "@/modules/rankflow/data";

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

async function getConfig(tenantId: string): Promise<CompensationPlanConfig> {
  const admin = createAdminClient();
  const { data } = await admin.from("compensation_plans").select("config").eq("tenant_id", tenantId).maybeSingle();
  return data ? normalizeConfig(data.config as Partial<CompensationPlanConfig>) : DEFAULT_PLAN_CONFIG;
}

async function getOpenPeriod(tenantId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("commission_periods")
    .select("id, label, start_date, end_date")
    .eq("tenant_id", tenantId)
    .eq("status", "OPEN")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// Todos los distribuidores del tenant, con el volumen del periodo abierto —
// se necesita el árbol completo para calcular el volumen de equipo del distribuidor.
async function getTenantDistributorsWithOpenVolume(tenantId: string): Promise<{ distributors: DistributorNode[]; periodLabel: string | null }> {
  const admin = createAdminClient();
  const { data: rows } = await admin.from("distributors").select("*").eq("tenant_id", tenantId);
  const period = await getOpenPeriod(tenantId);

  if (!rows) return { distributors: [], periodLabel: period?.label ?? null };
  if (!period) return { distributors: rows.map(rowToNode), periodLabel: null };

  const { data: entries } = await admin.from("volume_entries").select("distributor_id, amount").eq("tenant_id", tenantId).eq("period_id", period.id);
  const volumeByDistributor = new Map<string, number>();
  for (const e of entries ?? []) volumeByDistributor.set(e.distributor_id, (volumeByDistributor.get(e.distributor_id) ?? 0) + Number(e.amount));

  const distributors = rows.map((r) => {
    const node = rowToNode(r);
    node.personalVolume = volumeByDistributor.get(node.id) ?? 0;
    return node;
  });

  return { distributors, periodLabel: period.label };
}

function countDownline(distributors: DistributorNode[], rootId: string): { total: number; active: number; direct: number } {
  const direct = getSponsoredChildren(distributors, rootId);
  const visited = new Set<string>();
  function walk(id: string) {
    for (const child of getSponsoredChildren(distributors, id)) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      walk(child.id);
    }
  }
  walk(rootId);
  const all = [...visited].map((id) => distributors.find((d) => d.id === id)!).filter(Boolean);
  return { total: all.length, active: all.filter((d) => d.status === "ACTIVE").length, direct: direct.length };
}

export interface PortalDashboardData {
  distributor: CurrentDistributor;
  periodLabel: string | null;
  periodEndDate: string | null;
  binaryEnabled: boolean;
  leftVolume: number;
  rightVolume: number;
  personalVolume: number;
  teamVolume: number;
  currentRank: string;
  nextRank: string | null;
  nextRankPersonalReq: number;
  nextRankTeamReq: number;
  downlineTotal: number;
  downlineActive: number;
  directCount: number;
}

export async function getPortalDashboard(distributor: CurrentDistributor): Promise<PortalDashboardData> {
  const [config, { distributors, periodLabel }] = await Promise.all([
    getConfig(distributor.tenantId),
    getTenantDistributorsWithOpenVolume(distributor.tenantId),
  ]);
  const admin = createAdminClient();
  const period = await getOpenPeriod(distributor.tenantId);

  const self = distributors.find((d) => d.id === distributor.id);
  const children = getPlacementChildren(distributors, distributor.id);
  const left = children.find((c) => c.placementLeg === "LEFT");
  const right = children.find((c) => c.placementLeg === "RIGHT");

  const q = computeQualifiedRank(distributors, config, distributor.id);
  const rankIdx = config.ranks.indexOf(q?.qualifiedRank ?? self?.rank ?? config.ranks[0]);
  const nextRank = rankIdx >= 0 && rankIdx < config.ranks.length - 1 ? config.ranks[rankIdx + 1] : null;
  const nextReq = nextRank ? config.rankRequirements[nextRank] : null;

  const downline = countDownline(distributors, distributor.id);

  return {
    distributor,
    periodLabel,
    periodEndDate: period?.end_date ?? null,
    binaryEnabled: config.binary.enabled,
    leftVolume: left ? getLegVolume(distributors, left.id) : 0,
    rightVolume: right ? getLegVolume(distributors, right.id) : 0,
    personalVolume: self?.personalVolume ?? 0,
    teamVolume: q?.teamVolume ?? 0,
    currentRank: q?.qualifiedRank ?? self?.rank ?? config.ranks[0],
    nextRank,
    nextRankPersonalReq: nextReq?.personalVolume ?? 0,
    nextRankTeamReq: nextReq?.teamVolume ?? 0,
    downlineTotal: downline.total,
    downlineActive: downline.active,
    directCount: downline.direct,
  };
}

export async function getPortalTeamTree(distributor: CurrentDistributor): Promise<{ distributors: DistributorNode[]; ranks: string[]; binaryEnabled: boolean }> {
  const [config, { distributors }] = await Promise.all([getConfig(distributor.tenantId), getTenantDistributorsWithOpenVolume(distributor.tenantId)]);
  return { distributors, ranks: config.ranks, binaryEnabled: config.binary.enabled };
}

export interface PortalEarningRow {
  periodLabel: string;
  closedAt: string | null;
  rank: string;
  totalAmount: number;
}

export async function getPortalEarnings(distributor: CurrentDistributor): Promise<{ rows: PortalEarningRow[]; lifetimeTotal: number }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("commission_runs")
    .select("rank, total_amount, created_at, commission_periods(label, closed_at)")
    .eq("tenant_id", distributor.tenantId)
    .eq("distributor_id", distributor.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map((r: any) => ({
    periodLabel: r.commission_periods?.label ?? "—",
    closedAt: r.commission_periods?.closed_at ?? null,
    rank: r.rank,
    totalAmount: Number(r.total_amount),
  }));

  return { rows, lifetimeTotal: rows.reduce((sum, r) => sum + r.totalAmount, 0) };
}

export interface PortalTicket {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  createdAt: string;
}

export async function getPortalTickets(distributor: CurrentDistributor, userId: string): Promise<PortalTicket[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tickets")
    .select("id, subject, status, created_at")
    .eq("tenant_id", distributor.tenantId)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((t) => ({ id: t.id, subject: t.subject, status: t.status, createdAt: t.created_at }));
}

export async function createPortalTicket(distributor: CurrentDistributor, userId: string, subject: string, description: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("tickets").insert({
    tenant_id: distributor.tenantId,
    subject,
    description: description || null,
    priority: "MEDIUM",
    created_by: userId,
  });
  if (error) throw new Error(error.message);
}
