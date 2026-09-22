// ==========================================
// Configuración del Plan de Compensación — editable por cada compañía
// desde /dashboard/rankflow/settings. Esta es la ÚNICA fuente de verdad
// para rangos, porcentajes y topes; el motor de comisiones y los árboles
// de genealogía la reciben como parámetro, nunca hardcodean valores.
// ==========================================

export interface CompensationPlanConfig {
  ranks: string[];

  binary: {
    enabled: boolean;
    percent: number;
    capsByRank: Record<string, number>;
  };

  unilevel: {
    enabled: boolean;
    levelPercents: number[];
  };

  generation: {
    enabled: boolean;
    percents: number[];
    minRankToEarn: string;
    minRankForLeader: string;
  };
}

export const DEFAULT_PLAN_CONFIG: CompensationPlanConfig = {
  ranks: ["Distribuidor", "Bronce", "Plata", "Rubí", "Esmeralda", "Diamante"],
  binary: {
    enabled: true,
    percent: 0.10,
    capsByRank: {
      Distribuidor: 500,
      Bronce: 1000,
      Plata: 2000,
      Rubí: 5000,
      Esmeralda: 10000,
      Diamante: 25000,
    },
  },
  unilevel: {
    enabled: true,
    levelPercents: [0.05, 0.04, 0.03, 0.02, 0.01],
  },
  generation: {
    enabled: true,
    percents: [0.03, 0.02, 0.01],
    minRankToEarn: "Rubí",
    minRankForLeader: "Rubí",
  },
};

export function rankAtLeast(ranks: string[], rank: string, min: string): boolean {
  const rankIdx = ranks.indexOf(rank);
  const minIdx = ranks.indexOf(min);
  if (rankIdx === -1 || minIdx === -1) return false;
  return rankIdx >= minIdx;
}

const RANK_PALETTE = [
  "bg-muted text-muted-foreground",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  "bg-red-500/10 text-red-600 dark:text-red-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
];

export function getRankColorClass(ranks: string[], rank: string): string {
  const idx = ranks.indexOf(rank);
  if (idx === -1) return RANK_PALETTE[0];
  return RANK_PALETTE[idx % RANK_PALETTE.length];
}
