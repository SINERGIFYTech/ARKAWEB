import {
  getGenealogyData,
  getCompensationPlan,
  getCommissionHistory,
  getVolumeHistoryByPeriod,
} from "@/modules/rankflow/repository";
import { mockDistributors } from "@/modules/rankflow/data";

export interface AnalyticsData {
  isDemo: boolean;
  totalDistributors: number;
  activeDistributors: number;
  openPeriodVolume: number;
  lifetimePaid: number;
  volumeByPeriod: Array<{ label: string; volumen: number }>;
  commissionsByPeriod: Array<{ label: string; comisiones: number }>;
  rankDistribution: Array<{ rank: string; cantidad: number }>;
  topDistributors: Array<{ name: string; volumen: number }>;
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const [{ distributors, isDemo }, { config }] = await Promise.all([getGenealogyData(), getCompensationPlan()]);

  const rankCounts = new Map<string, number>();
  for (const d of distributors) {
    rankCounts.set(d.rank, (rankCounts.get(d.rank) ?? 0) + 1);
  }
  const rankDistribution = config.ranks
    .map((rank) => ({ rank, cantidad: rankCounts.get(rank) ?? 0 }))
    .filter((r) => r.cantidad > 0);

  const topDistributors = [...distributors]
    .sort((a, b) => b.personalVolume - a.personalVolume)
    .slice(0, 8)
    .map((d) => ({ name: d.fullName, volumen: d.personalVolume }));

  const openPeriodVolume = distributors.reduce((sum, d) => sum + d.personalVolume, 0);
  const activeDistributors = distributors.filter((d) => d.status === "ACTIVE").length;

  if (isDemo) {
    // Serie de ejemplo — no hay periodos reales todavía en modo demo.
    const demoWeeks = ["Sem -6", "Sem -5", "Sem -4", "Sem -3", "Sem -2", "Sem -1", "Actual"];
    const volumeByPeriod = demoWeeks.map((label, i) => ({ label, volumen: 8000 + i * 1400 + (i % 2 === 0 ? 900 : 0) }));
    const commissionsByPeriod = demoWeeks.slice(0, 6).map((label, i) => ({ label, comisiones: 900 + i * 180 }));
    const lifetimePaid = commissionsByPeriod.reduce((sum, c) => sum + c.comisiones, 0);

    return {
      isDemo: true,
      totalDistributors: mockDistributors.length,
      activeDistributors: mockDistributors.filter((d) => d.status === "ACTIVE").length,
      openPeriodVolume,
      lifetimePaid,
      volumeByPeriod,
      commissionsByPeriod,
      rankDistribution,
      topDistributors,
    };
  }

  const [volumeHistory, commissionHistory] = await Promise.all([getVolumeHistoryByPeriod(8), getCommissionHistory()]);

  const volumeByPeriod = volumeHistory.map((p) => ({ label: p.label.replace("Semana del ", ""), volumen: p.totalVolume }));

  const commissionsByPeriod = [...commissionHistory]
    .reverse()
    .slice(-8)
    .map((p) => ({ label: p.label.replace("Semana del ", ""), comisiones: p.totalPaid }));

  const lifetimePaid = commissionHistory.reduce((sum, p) => sum + p.totalPaid, 0);

  return {
    isDemo: false,
    totalDistributors: distributors.length,
    activeDistributors,
    openPeriodVolume,
    lifetimePaid,
    volumeByPeriod,
    commissionsByPeriod,
    rankDistribution,
    topDistributors,
  };
}
