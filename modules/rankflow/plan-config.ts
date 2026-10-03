// ==========================================
// Configuración del Plan de Compensación — editable por cada compañía
// desde /dashboard/rankflow/settings. Esta es la ÚNICA fuente de verdad
// para rangos, porcentajes y topes; el motor de comisiones, el motor de
// rangos y los árboles de genealogía la reciben como parámetro, nunca
// hardcodean valores.
// ==========================================

export interface RankRequirement {
  personalVolume: number;
  teamVolume: number; // volumen total del equipo de patrocinio (incluye al propio distribuidor)
}

export interface CompensationPlanConfig {
  ranks: string[];

  // Requisitos para calificar a cada rango automáticamente. Si un rango no
  // tiene requisito definido, se asume 0 (cualquiera califica).
  rankRequirements: Record<string, RankRequirement>;

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

  // Bono de rango: monto fijo por rango.
  //  - RECURRING: se paga cada periodo mientras el distribuidor recalifique a ese rango.
  //  - ONE_TIME: bono de bienvenida, se paga una sola vez la primera vez que califica a ese rango.
  rankBonus: {
    enabled: boolean;
    mode: "RECURRING" | "ONE_TIME";
    amountsByRank: Record<string, number>;
  };

  // Matching: % de lo que ganan (binario+unilevel+generacional) tus patrocinados,
  // un porcentaje por nivel (nivel 1 = patrocinados directos, nivel 2 = los de ellos...).
  matching: {
    enabled: boolean;
    levelPercents: number[];
  };

  // % sobre el volumen capturado a un distribuidor dentro de sus primeros
  // windowDays de vida — se le paga a quien lo patrocinó.
  fastStart: {
    enabled: boolean;
    percent: number;
    windowDays: number;
  };

  // % del volumen TOTAL de la compañía en el periodo, repartido entre quienes
  // califiquen al rango mínimo.
  globalBonus: {
    enabled: boolean;
    poolPercent: number;
    minRankToQualify: string;
    splitMethod: "EQUAL" | "PRO_RATA_VOLUME";
  };

  // Anual — % del volumen (personal o de equipo) del año, se calcula aparte
  // con una herramienta manual, no en cada cierre de periodo semanal.
  christmasBonus: {
    enabled: boolean;
    percent: number;
    basedOn: "PERSONAL" | "TEAM";
  };

  // Bonos que exigen mantener un rango varios periodos SEGUIDOS (auto por
  // rango, viaje por rango, etc). cashAmount = 0 significa "solo calificación"
  // (ej. viaje: no paga dinero, solo entra a la lista de calificados).
  qualificationBonuses: Array<{
    id: string;
    name: string;
    minRank: string;
    consecutivePeriods: number;
    cashAmount: number;
  }>;
}

export const DEFAULT_PLAN_CONFIG: CompensationPlanConfig = {
  ranks: ["Distribuidor", "Bronce", "Plata", "Rubí", "Esmeralda", "Diamante"],
  rankRequirements: {
    Distribuidor: { personalVolume: 0, teamVolume: 0 },
    Bronce: { personalVolume: 100, teamVolume: 500 },
    Plata: { personalVolume: 200, teamVolume: 2000 },
    Rubí: { personalVolume: 400, teamVolume: 6000 },
    Esmeralda: { personalVolume: 800, teamVolume: 15000 },
    Diamante: { personalVolume: 1500, teamVolume: 35000 },
  },
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
  rankBonus: {
    enabled: false,
    mode: "RECURRING",
    amountsByRank: {},
  },
  matching: {
    enabled: false,
    levelPercents: [0.1],
  },
  fastStart: {
    enabled: false,
    percent: 0.2,
    windowDays: 30,
  },
  globalBonus: {
    enabled: false,
    poolPercent: 0.01,
    minRankToQualify: "Diamante",
    splitMethod: "EQUAL",
  },
  christmasBonus: {
    enabled: false,
    percent: 0.02,
    basedOn: "PERSONAL",
  },
  qualificationBonuses: [],
};

// Los planes guardados antes de que existieran ciertos campos no los traen:
// se completan con los valores por defecto para que nunca truene al cargar.
export function normalizeConfig(saved: Partial<CompensationPlanConfig> | null | undefined): CompensationPlanConfig {
  const d = DEFAULT_PLAN_CONFIG;
  if (!saved) return d;
  return {
    ...d,
    ...saved,
    rankRequirements: { ...d.rankRequirements, ...(saved.rankRequirements ?? {}) },
    binary: { ...d.binary, ...(saved.binary ?? {}) },
    unilevel: { ...d.unilevel, ...(saved.unilevel ?? {}) },
    generation: { ...d.generation, ...(saved.generation ?? {}) },
    rankBonus: { ...d.rankBonus, ...(saved.rankBonus ?? {}) },
    matching: { ...d.matching, ...(saved.matching ?? {}) },
    fastStart: { ...d.fastStart, ...(saved.fastStart ?? {}) },
    globalBonus: { ...d.globalBonus, ...(saved.globalBonus ?? {}) },
    christmasBonus: { ...d.christmasBonus, ...(saved.christmasBonus ?? {}) },
    qualificationBonuses: saved.qualificationBonuses ?? d.qualificationBonuses,
  };
}

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
