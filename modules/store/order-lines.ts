// Lógica pura de pedidos: arma las líneas con el precio y el CV de ESE momento
// (foto congelada) y calcula los totales. Nunca confía en precios del navegador.

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  cv: number;
  isEnrollmentPackage: boolean;
  isActive: boolean;
}

export interface OrderLine {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCv: number;
}

export function buildOrderLines(
  catalog: CatalogProduct[],
  items: Array<{ productId: string; quantity: number }>,
  opts: { allowEnrollmentPackages: boolean }
): { lines: OrderLine[]; totalPrice: number; totalCv: number } {
  if (!items.length) throw new Error("El pedido no tiene productos.");

  const byId = new Map(catalog.map((p) => [p.id, p]));
  const merged = new Map<string, number>();
  for (const it of items) {
    const qty = Number(it.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 1000) throw new Error("Cantidad inválida (entero entre 1 y 1000).");
    merged.set(it.productId, (merged.get(it.productId) ?? 0) + qty);
  }

  const lines: OrderLine[] = [];
  for (const [productId, quantity] of merged) {
    const p = byId.get(productId);
    if (!p || !p.isActive) throw new Error("Uno de los productos ya no está disponible.");
    if (p.isEnrollmentPackage && !opts.allowEnrollmentPackages) throw new Error(`"${p.name}" es un paquete de inscripción y no se puede comprar aquí.`);
    lines.push({ productId, sku: p.sku, name: p.name, quantity, unitPrice: p.price, unitCv: p.cv });
  }

  const cents = (n: number) => Math.round(n * 100);
  const totalPrice = lines.reduce((s, l) => s + cents(l.unitPrice) * l.quantity, 0) / 100;
  const totalCv = lines.reduce((s, l) => s + cents(l.unitCv) * l.quantity, 0) / 100;
  return { lines, totalPrice, totalCv };
}
