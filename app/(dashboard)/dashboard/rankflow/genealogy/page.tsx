import { getGenealogyData, getCompensationPlan } from "@/modules/rankflow/repository";
import { GenealogyClient } from "@/modules/rankflow/genealogy-client";
import { recordUsageEvent, USAGE_EVENT_TYPES } from "@/lib/usage";

export default async function GenealogyPage() {
  const [{ distributors, isDemo, period, tenantId }, { config }] = await Promise.all([
    getGenealogyData(),
    getCompensationPlan(),
  ]);

  if (tenantId) {
    await recordUsageEvent(tenantId, USAGE_EVENT_TYPES.GENEALOGY_QUERY, 1);
  }

  return (
    <GenealogyClient
      distributors={distributors}
      ranks={config.ranks}
      isDemo={isDemo}
      periodLabel={period?.label ?? null}
      binaryEnabled={config.binary.enabled}
    />
  );
}
