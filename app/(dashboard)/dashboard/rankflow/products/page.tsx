import { getProducts, getPaymentInstructions } from "@/modules/store/repository";
import { ProductsClient } from "@/modules/store/products-client";

export default async function ProductsPage() {
  const [{ products, isDemo }, paymentInstructions] = await Promise.all([getProducts(), getPaymentInstructions()]);
  return <ProductsClient products={products} paymentInstructions={paymentInstructions} isDemo={isDemo} />;
}
