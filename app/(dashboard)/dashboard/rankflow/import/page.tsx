import { getCurrentTenantId } from "@/lib/tenant";
import { ImportClient } from "@/modules/store/import-client";

export default async function ImportPage() {
  const tenantId = await getCurrentTenantId();
  return <ImportClient isDemo={!tenantId} />;
}
