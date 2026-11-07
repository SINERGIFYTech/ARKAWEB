import type { OrderLine } from "@/modules/store/order-lines";

// Inserta el pedido y sus líneas. Si las líneas fallan, borra el pedido para no
// dejar pedidos vacíos. Recibe el cliente porque lo usan dos contextos: el del
// equipo (con RLS) y el del portal (service role, acotado al distribuidor).
export async function insertOrderWithItems(
  client: any,
  p: {
    tenantId: string;
    distributorId: string;
    source: "ADMIN" | "PORTAL" | "ENROLLMENT";
    createdBy: string | null;
    paymentMethod: string | null;
    note: string | null;
    lines: OrderLine[];
    totalPrice: number;
    totalCv: number;
  }
): Promise<{ id: string; number: number }> {
  const { data: order, error } = await client
    .from("orders")
    .insert({
      tenant_id: p.tenantId,
      distributor_id: p.distributorId,
      status: "PENDING",
      source: p.source,
      total_price: p.totalPrice,
      total_cv: p.totalCv,
      payment_method: p.paymentMethod,
      note: p.note,
      created_by: p.createdBy,
    })
    .select("id, number")
    .single();
  if (error || !order) throw new Error(error?.message ?? "No se pudo crear el pedido.");

  const { error: itemsError } = await client.from("order_items").insert(
    p.lines.map((l) => ({
      tenant_id: p.tenantId,
      order_id: order.id,
      product_id: l.productId,
      sku: l.sku,
      name: l.name,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      unit_cv: l.unitCv,
    }))
  );
  if (itemsError) {
    await client.from("orders").delete().eq("id", order.id);
    throw new Error(itemsError.message);
  }
  return { id: order.id, number: order.number };
}
