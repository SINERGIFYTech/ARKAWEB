import { getAnalyticsData } from "@/modules/analytics/repository";
import { DashboardHomeClient } from "@/modules/dashboard/dashboard-home-client";

export default async function DashboardPage() {
  const data = await getAnalyticsData();
  return <DashboardHomeClient data={data} />;
}
