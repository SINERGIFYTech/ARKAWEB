import { getGenealogyData, getCompensationPlan } from "@/modules/rankflow/repository";
import { CommissionsClient } from "@/modules/rankflow/commissions-client";

export default async function CommissionsPage() {
  const [{ distributors, isDemo }, { config }] = await Promise.all([
    getGenealogyData(),
    getCompensationPlan(),
  ]);
  return <CommissionsClient distributors={distributors} config={config} isDemo={isDemo} />;
}
