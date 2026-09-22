import { getCompensationPlan } from "@/modules/rankflow/repository";
import { SettingsClient } from "@/modules/rankflow/settings-client";

export default async function RankflowSettingsPage() {
  const { config, isDemo } = await getCompensationPlan();
  return <SettingsClient initialConfig={config} isDemo={isDemo} />;
}
