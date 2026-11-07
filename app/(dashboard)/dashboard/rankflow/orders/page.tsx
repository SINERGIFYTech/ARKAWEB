import { getOrders, getProducts } from "@/modules/store/repository";
import { getDistributorList } from "@/modules/rankflow/repository";
import { OrdersClient } from "@/modules/store/orders-client";

export default async function OrdersPage() {
  const [{ orders, isDemo }, { products }, { rows }] = await Promise.all([getOrders(), getProducts(), getDistributorList()]);
  const distributors = rows.map((d) => ({ id: d.id, fullName: d.fullName, code: d.code }));
  return <OrdersClient orders={orders} products={products} distributors={distributors} isDemo={isDemo} />;
}
