import { getGenealogyData, getCompensationPlan, getPaidRankBonuses } from "@/modules/rankflow/repository";
import { CommissionsClient } from "@/modules/rankflow/commissions-client";

export default async function CommissionsPage() {
  const [{ distributors, isDemo, period }, { config }, paidRankBonuses] = await Promise.all([
    getGenealogyData(),
    getCompensationPlan(),
    getPaidRankBonuses(),
  ]);
  return (
    <CommissionsClient
      distributors={distributors}
      config={config}
      isDemo={isDemo}
      period={period}
      paidRankBonuses={paidRankBonuses}
    />
  );
}
