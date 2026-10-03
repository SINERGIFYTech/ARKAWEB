import { getCurrentDistributor } from "@/lib/distributor-auth";
import { getPortalTeamTree } from "@/modules/portal/repository";
import { PortalTeamClient } from "@/modules/portal/team-client";

export default async function PortalTeamPage() {
  const distributor = await getCurrentDistributor();
  if (!distributor) return null;

  const { distributors, ranks, binaryEnabled } = await getPortalTeamTree(distributor);
  return <PortalTeamClient distributors={distributors} ranks={ranks} binaryEnabled={binaryEnabled} rootId={distributor.id} />;
}
