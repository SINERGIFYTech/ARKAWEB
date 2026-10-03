import { getAutomationRules, getAutomationRuns } from "@/modules/automations/repository";
import { AutomationsClient } from "@/modules/automations/automations-client";

export default async function AutomationsPage() {
  const [{ rules, isDemo }, runs] = await Promise.all([getAutomationRules(), getAutomationRuns()]);
  return <AutomationsClient rules={rules} runs={runs} isDemo={isDemo} />;
}
