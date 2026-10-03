import { getCurrentDistributor } from "@/lib/distributor-auth";
import { getPortalDashboard } from "@/modules/portal/repository";
import { PortalDashboardClient } from "@/modules/portal/dashboard-client";

export default async function PortalDashboardPage() {
  const distributor = await getCurrentDistributor();
  if (!distributor) return null; // el layout ya protege, esto es solo por tipos

  const data = await getPortalDashboard(distributor);
  return <PortalDashboardClient data={data} />;
}
