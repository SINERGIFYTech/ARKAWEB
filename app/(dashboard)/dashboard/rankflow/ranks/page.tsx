import { getGenealogyData, getCompensationPlan } from "@/modules/rankflow/repository";
import { RanksClient } from "@/modules/rankflow/ranks-client";

export default async function RanksPage() {
  const [{ distributors, isDemo, period }, { config }] = await Promise.all([
    getGenealogyData(),
    getCompensationPlan(),
  ]);
  return <RanksClient distributors={distributors} config={config} isDemo={isDemo} periodLabel={period?.label ?? null} />;
}
