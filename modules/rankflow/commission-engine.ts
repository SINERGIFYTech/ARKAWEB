import { getPlacementChildren, getSponsoredChildren, getLegVolume, findById, type DistributorNode } from "@/modules/rankflow/data";
import { rankAtLeast, type CompensationPlanConfig } from "@/modules/rankflow/plan-config";

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
function getSponsorSubtreeVolume(distributors: DistributorNode[], id: string): number {
  const node = findById(distributors, id);
  if (!node) return 0;
  const children = getSponsoredChildren(distributors, id);
  return node.personalVolume + children.reduce((sum, c) => sum + getSponsorSubtreeVolume(distributors, c.id), 0);
}

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

// ---------- RESUMEN POR DISTRIBUIDOR ----------
export function calculateTotalCommission(
  distributors: DistributorNode[],
  config: CompensationPlanConfig,
  distributorId: string
) {
  const binary = calculateBinaryCommission(distributors, config, distributorId);
  const unilevel = calculateUnilevelCommission(distributors, config, distributorId);
  const generation = calculateGenerationCommission(distributors, config, distributorId);
  const total = binary.capped + unilevel.total + generation.total;
  return { binary, unilevel, generation, total };
}

export function calculateAllCommissions(distributors: DistributorNode[], config: CompensationPlanConfig) {
  return distributors.map((d) => ({
    distributor: d,
    ...calculateTotalCommission(distributors, config, d.id),
  }));
}
