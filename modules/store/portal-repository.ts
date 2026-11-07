import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { recordUsageEvent } from "@/lib/usage";
import type { CurrentDistributor } from "@/lib/distributor-auth";
import { buildOrderLines, type CatalogProduct } from "@/modules/store/order-lines";
import { insertOrderWithItems } from "@/modules/store/order-writer";

// El distribuidor NO es staff del tenant, así que aquí no aplica RLS normal: se
// usa el service role, siempre acotado a su tenant y a su propio distributor_id.

function rowToCatalog(r: any): CatalogProduct & { description: string | null } {
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    description: r.description,
    price: Number(r.price),
    cv: Number(r.cv),
    isEnrollmentPackage: r.is_enrollment_package,
    isActive: r.is_active,
  };
}

async function readPaymentInstructions(tenantId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("settings").eq("id", tenantId).maybeSingle();
  return ((data?.settings as any)?.paymentInstructions as string) ?? "";
}

export interface PortalOrder {
  id: string;
  number: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  totalPrice: number;
  createdAt: string;
  summary: string;
}

export async function getPortalShop(distributor: CurrentDistributor) {
  const admin = createAdminClient();

  const productRows = await fetchAll((a, b) =>
    admin
      .from("products")
      .select("*")
      .eq("tenant_id", distributor.tenantId)
      .eq("is_active", true)
      .eq("is_enrollment_package", false)
      .order("name")
      .order("id")
      .range(a, b)
  );

  const { data: orderRows } = await admin
    .from("orders")
    .select("id, number, status, total_price, created_at")
    .eq("tenant_id", distributor.tenantId)
    .eq("distributor_id", distributor.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const orderIds = (orderRows ?? []).map((o: any) => o.id);
  const itemsByOrder = new Map<string, string[]>();
  if (orderIds.length > 0) {
    const { data: items } = await admin.from("order_items").select("order_id, name, quantity").in("order_id", orderIds);
    for (const it of items ?? []) {
      const arr = itemsByOrder.get(it.order_id) ?? [];
      arr.push(`${it.quantity}× ${it.name}`);
      itemsByOrder.set(it.order_id, arr);
    }
  }

  const orders: PortalOrder[] = (orderRows ?? []).map((o: any) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    totalPrice: Number(o.total_price),
    createdAt: o.created_at,
    summary: (itemsByOrder.get(o.id) ?? []).join(", "),
  }));

  return {
    // El CV no se le muestra al distribuidor: es un dato interno del plan.
    products: productRows.map(rowToCatalog).map((p) => ({ id: p.id, sku: p.sku, name: p.name, description: p.description, price: p.price })),
    orders,
    paymentInstructions: await readPaymentInstructions(distributor.tenantId),
  };
}

export async function createPortalOrder(distributor: CurrentDistributor, userId: string, items: Array<{ productId: string; quantity: number }>) {
  const admin = createAdminClient();
  const rows = await fetchAll((a, b) =>
    admin.from("products").select("*").eq("tenant_id", distributor.tenantId).order("id").range(a, b)
  );
  // Los precios y el CV salen SIEMPRE de la base de datos, nunca del navegador.
  const { lines, totalPrice, totalCv } = buildOrderLines(rows.map(rowToCatalog), items, { allowEnrollmentPackages: false });

  const order = await insertOrderWithItems(admin, {
    tenantId: distributor.tenantId,
    distributorId: distributor.id,
    source: "PORTAL",
    createdBy: userId,
    paymentMethod: null,
    note: null,
    lines,
    totalPrice,
    totalCv,
  });
  return { number: order.number, totalPrice, paymentInstructions: await readPaymentInstructions(distributor.tenantId) };
}

export async function getReferralInfo(distributor: CurrentDistributor): Promise<{ slug: string; code: string }> {
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("slug").eq("id", distributor.tenantId).maybeSingle();
  return { slug: data?.slug ?? "", code: distributor.code };
}
