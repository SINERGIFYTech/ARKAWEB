import { ShoppingCart } from "lucide-react";
import { ComingSoon } from "@/modules/portal/coming-soon";

export default function PortalShopPage() {
  return <ComingSoon title="Tienda" icon={ShoppingCart} description="Catálogo de productos para comprar o reordenar — falta construir el módulo de inventario/catálogo." />;
}
