import { getAnalyticsData } from "@/modules/analytics/repository";
import { AnalyticsClient } from "@/modules/analytics/analytics-client";

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();
  return <AnalyticsClient data={data} />;
}
