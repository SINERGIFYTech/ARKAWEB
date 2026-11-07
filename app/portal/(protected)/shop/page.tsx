import { getCurrentDistributor } from "@/lib/distributor-auth";
import { getPortalShop } from "@/modules/store/portal-repository";
import { PortalShopClient } from "@/modules/portal/shop-client";

export default async function PortalShopPage() {
  const distributor = await getCurrentDistributor();
  if (!distributor) return null;
  const { products, orders, paymentInstructions } = await getPortalShop(distributor);
  return <PortalShopClient products={products} orders={orders} paymentInstructions={paymentInstructions} />;
}
