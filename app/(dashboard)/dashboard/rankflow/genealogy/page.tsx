import { getGenealogyData, getCompensationPlan } from "@/modules/rankflow/repository";
import { GenealogyClient } from "@/modules/rankflow/genealogy-client";

export default async function GenealogyPage() {
  const [{ distributors, isDemo }, { config }] = await Promise.all([
    getGenealogyData(),
    getCompensationPlan(),
  ]);
  return <GenealogyClient distributors={distributors} ranks={config.ranks} isDemo={isDemo} />;
}
