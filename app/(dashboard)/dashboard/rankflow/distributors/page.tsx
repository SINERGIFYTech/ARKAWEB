import { getDistributorList } from "@/modules/rankflow/repository";
import { DistributorListClient } from "@/modules/rankflow/distributor-list-client";

export default async function DistributorsPage() {
  const { rows, isDemo } = await getDistributorList();
  return <DistributorListClient rows={rows} isDemo={isDemo} />;
}
