import { getPlacementChildren, getSponsoredChildren, getLegVolume, getSponsorSubtreeVolume, findById, type DistributorNode } from "@/modules/rankflow/data";
import { rankAtLeast, type CompensationPlanConfig } from "@/modules/rankflow/plan-config";
import { computeQualifiedRank } from "@/modules/rankflow/rank-engine";

// ---------- BINARIO ----------
export function calculateBinaryCommission(
  distributors: DistributorNode[],
  config: CompensationPlanConfig,
  distributorId: string
) {
  const self = findById(distributors, distributorId);
  if (!self || !config.binary.enabled) return { raw: 0, capped: 0, cap: 0, leftVol: 0, rightVol: 0 };

  const children = getPlacementChildren(distributors, distributorId);
  const left = children.find((c) => c.placementLeg === "LEFT");
  const right = children.find((c) => c.placementLeg === "RIGHT");
  const leftVol = left ? getLegVolume(distributors, left.id) : 0;
  const rightVol = right ? getLegVolume(distributors, right.id) : 0;
  const minorLeg = Math.min(leftVol, rightVol);

  const raw = minorLeg * config.binary.percent;
  const cap = config.binary.capsByRank[self.rank] ?? Infinity;
  const capped = Math.min(raw, cap);

  return { raw, capped, cap, leftVol, rightVol };
}

// ---------- UNILEVEL ----------
function getLevelVolumes(distributors: DistributorNode[], rootId: string, maxLevel: number): number[] {
  const totals = new Array(maxLevel).fill(0);
  function walk(id: string, level: number) {
    if (level > maxLevel) return;
    const children = getSponsoredChildren(distributors, id);
    for (const child of children) {
      totals[level - 1] += child.personalVolume;
      walk(child.id, level + 1);
    }
  }
  walk(rootId, 1);
  return totals;
}

export function calculateUnilevelCommission(
  distributors: DistributorNode[],
  config: CompensationPlanConfig,
  distributorId: string
) {
  if (!config.unilevel.enabled || config.unilevel.levelPercents.length === 0) {
    return { total: 0, byLevel: [] as Array<{ level: number; volume: number; percent: number; commission: number }> };
  }
  const levelPercents = config.unilevel.levelPercents;
  const levelVolumes = getLevelVolumes(distributors, distributorId, levelPercents.length);
  const byLevel = levelVolumes.map((vol, i) => ({
    level: i + 1,
    volume: vol,
    percent: levelPercents[i],
    commission: vol * levelPercents[i],
  }));
  const total = byLevel.reduce((sum, l) => sum + l.commission, 0);
  return { total, byLevel };
}

// ---------- GENERACIONAL (breakaway) ----------

function collectGenerationLeaders(
  distributors: DistributorNode[],
  ranks: string[],
  startIds: string[],
  minRank: string,
  maxGenerations: number
): string[][] {
  const generations: string[][] = [];
  let currentLevel = startIds;

  for (let gen = 0; gen < maxGenerations; gen++) {
    const leadersThisGen: string[] = [];
    function search(id: string) {
      const children = getSponsoredChildren(distributors, id);
      for (const child of children) {
        if (rankAtLeast(ranks, child.rank, minRank)) {
          leadersThisGen.push(child.id);
        } else {
          search(child.id);
        }
      }
    }
    currentLevel.forEach(search);
    generations.push(leadersThisGen);
    currentLevel = leadersThisGen;
    if (currentLevel.length === 0) break;
  }
  return generations;
}

export function calculateGenerationCommission(
  distributors: DistributorNode[],
  config: CompensationPlanConfig,
  distributorId: string
) {
  const self = findById(distributors, distributorId);
  const { percents, minRankToEarn, minRankForLeader, enabled } = config.generation;

  if (!enabled || !self || !rankAtLeast(config.ranks, self.rank, minRankToEarn)) {
    return { total: 0, byGeneration: [] as Array<{ generation: number; leaderCount: number; volume: number; percent: number; commission: number }>, qualifies: false };
  }

  const directChildren = getSponsoredChildren(distributors, distributorId).map((c) => c.id);
  const generations = collectGenerationLeaders(distributors, config.ranks, directChildren, minRankForLeader, percents.length);

  const byGeneration = generations.map((leaderIds, i) => {
    const volume = leaderIds.reduce((sum, id) => sum + getSponsorSubtreeVolume(distributors, id), 0);
    const percent = percents[i] ?? 0;
    return { generation: i + 1, leaderCount: leaderIds.length, volume, percent, commission: volume * percent };
  });

  const total = byGeneration.reduce((sum, g) => sum + g.commission, 0);
  return { total, byGeneration, qualifies: true };
}

// ---------- BONO DE RANGO ----------
// Se paga por el rango que el distribuidor CALIFICA con el volumen de este periodo
// (no por el rango guardado, que se actualiza hasta el cierre).
//  - RECURRING: cada periodo que recalifique.
//  - ONE_TIME: solo la primera vez que califica a ese rango (paidRanks = rangos ya pagados).
// Simplificación: si alguien salta varios rangos de golpe, solo se paga el rango al que llegó.
export function calculateRankBonus(
  distributors: DistributorNode[],
  config: CompensationPlanConfig,
  distributorId: string,
  paidRanks: string[] = []
) {
  const none = { amount: 0, rank: "", mode: config.rankBonus.mode };
  if (!config.rankBonus.enabled) return none;

  const q = computeQualifiedRank(distributors, config, distributorId);
  if (!q) return none;

  const amount = config.rankBonus.amountsByRank[q.qualifiedRank] ?? 0;
  if (!(amount > 0)) return { ...none, rank: q.qualifiedRank };
  if (config.rankBonus.mode === "ONE_TIME" && paidRanks.includes(q.qualifiedRank)) {
    return { ...none, rank: q.qualifiedRank };
  }
  return { amount, rank: q.qualifiedRank, mode: config.rankBonus.mode };
}

// ---------- MATCHING ----------
// % de las ganancias base de tus patrocinados, por nivel del árbol de patrocinio.
// Base = binario + unilevel + generacional (no incluye bono de rango ni otros matching,
// para evitar que el matching se pague sobre sí mismo).
export function calculateMatchingBonus(
  distributors: DistributorNode[],
  config: CompensationPlanConfig,
  distributorId: string,
  baseEarnings: Record<string, number>
) {
  const empty = { total: 0, byLevel: [] as Array<{ level: number; base: number; percent: number; commission: number }> };
  if (!config.matching.enabled || config.matching.levelPercents.length === 0) return empty;

  const byLevel: typeof empty.byLevel = [];
  let current = getSponsoredChildren(distributors, distributorId);

  for (let i = 0; i < config.matching.levelPercents.length; i++) {
    const percent = config.matching.levelPercents[i];
    const base = current.reduce((sum, d) => sum + (baseEarnings[d.id] ?? 0), 0);
    byLevel.push({ level: i + 1, base, percent, commission: base * percent });
    current = current.flatMap((d) => getSponsoredChildren(distributors, d.id));
  }

  return { total: byLevel.reduce((sum, l) => sum + l.commission, 0), byLevel };
}

// ---------- BONO GLOBAL ----------
// % del volumen TOTAL de la compañía este periodo, repartido entre quienes
// califican al rango mínimo — parejo o proporcional a su propio volumen.
export function calculateGlobalBonusPool(distributors: DistributorNode[], config: CompensationPlanConfig) {
  const empty = { pool: 0, qualifiers: [] as DistributorNode[], amounts: {} as Record<string, number> };
  if (!config.globalBonus.enabled) return empty;

  const totalVolume = distributors.reduce((sum, d) => sum + d.personalVolume, 0);
  const pool = totalVolume * config.globalBonus.poolPercent;
  const qualifiers = distributors.filter((d) => rankAtLeast(config.ranks, d.rank, config.globalBonus.minRankToQualify));

  if (pool <= 0 || qualifiers.length === 0) return { pool, qualifiers, amounts: {} };

  const amounts: Record<string, number> = {};
  if (config.globalBonus.splitMethod === "EQUAL") {
    const each = pool / qualifiers.length;
    for (const q of qualifiers) amounts[q.id] = each;
  } else {
    const qualifiersVolume = qualifiers.reduce((sum, q) => sum + q.personalVolume, 0);
    for (const q of qualifiers) {
      amounts[q.id] = qualifiersVolume > 0 ? pool * (q.personalVolume / qualifiersVolume) : 0;
    }
  }
  return { pool, qualifiers, amounts };
}

// ---------- RESUMEN POR DISTRIBUIDOR ----------
export interface CommissionContext {
  // distributorId -> rangos cuyo bono de bienvenida (ONE_TIME) ya se pagó antes
  paidRankBonuses?: Record<string, string[]>;
  // distributorId -> monto de inicio rápido calculado para este periodo (query externa, con fechas)
  fastStartAmounts?: Record<string, number>;
  // distributorId -> monto de bono de calificación sostenida (auto/viaje) para este periodo
  qualificationAmounts?: Record<string, number>;
}

export function calculateAllCommissions(
  distributors: DistributorNode[],
  config: CompensationPlanConfig,
  ctx: CommissionContext = {}
) {
  // Pasada 1: todo lo que no depende de las ganancias de otros.
  const first = distributors.map((d) => {
    const binary = calculateBinaryCommission(distributors, config, d.id);
    const unilevel = calculateUnilevelCommission(distributors, config, d.id);
    const generation = calculateGenerationCommission(distributors, config, d.id);
    const rankBonus = calculateRankBonus(distributors, config, d.id, ctx.paidRankBonuses?.[d.id] ?? []);
    const base = binary.capped + unilevel.total + generation.total;
    return { distributor: d, binary, unilevel, generation, rankBonus, base };
  });

  const baseEarnings: Record<string, number> = {};
  for (const r of first) baseEarnings[r.distributor.id] = r.base;

  const globalPool = calculateGlobalBonusPool(distributors, config);
  const fastStartAmounts = ctx.fastStartAmounts ?? {};
  const qualificationAmounts = ctx.qualificationAmounts ?? {};

  // Pasada 2: matching, que sí depende de lo que ganaron los patrocinados.
  return first.map((r) => {
    const matching = calculateMatchingBonus(distributors, config, r.distributor.id, baseEarnings);
    const globalBonus = globalPool.amounts[r.distributor.id] ?? 0;
    const fastStart = fastStartAmounts[r.distributor.id] ?? 0;
    const qualificationBonus = qualificationAmounts[r.distributor.id] ?? 0;
    const total = r.base + r.rankBonus.amount + matching.total + globalBonus + fastStart + qualificationBonus;
    return { ...r, matching, globalBonus, fastStart, qualificationBonus, total };
  });
}

export function calculateTotalCommission(
  distributors: DistributorNode[],
  config: CompensationPlanConfig,
  distributorId: string,
  ctx: CommissionContext = {}
) {
  const row = calculateAllCommissions(distributors, config, ctx).find((r) => r.distributor.id === distributorId);
  if (!row) throw new Error("Distribuidor no encontrado");
  return row;
}
