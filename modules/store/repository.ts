import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTenantId } from "@/lib/tenant";
import { assertOwnerOrAdmin } from "@/lib/permissions";
import { recordUsageEvent, USAGE_EVENT_TYPES } from "@/lib/usage";
import { getSiteUrl } from "@/lib/site-url";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { runAutomationsForTrigger } from "@/modules/automations/repository";
import { getOrCreateOpenPeriod, getCompensationPlan, getNetworkStructure } from "@/modules/rankflow/repository";
import { findPlacementSlot, chooseLeg, nextDistributorCode, type Leg } from "@/modules/rankflow/placement";
import { validateImport, type ImportValidation } from "@/modules/rankflow/import-csv";
import { buildOrderLines, type CatalogProduct } from "@/modules/store/order-lines";
import { insertOrderWithItems } from "@/modules/store/order-writer";

const NOT_CONFIGURED = "Base de datos no configurada — conecta Supabase para operar la tienda real.";

async function requireTenant(): Promise<string> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error(NOT_CONFIGURED);
  return tenantId;
}

// ---------- PRODUCTOS ----------

export interface ProductRow extends CatalogProduct {
  description: string | null;
}

function rowToProduct(r: any): ProductRow {
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

export async function getProducts(): Promise<{ products: ProductRow[]; isDemo: boolean }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { products: [], isDemo: true };
  const supabase = await createClient();
  const rows = await fetchAll((a, b) =>
    supabase.from("products").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).order("id").range(a, b)
  );
  return { products: rows.map(rowToProduct), isDemo: false };
}

export async function createProduct(input: {
  sku: string;
  name: string;
  description?: string;
  price: number;
  cv: number;
  isEnrollmentPackage: boolean;
}) {
  const tenantId = await requireTenant();
  await assertOwnerOrAdmin(tenantId);
  if (!input.sku.trim() || !input.name.trim()) throw new Error("SKU y nombre son obligatorios.");
  if (!(input.price >= 0) || !(input.cv >= 0)) throw new Error("Precio y CV deben ser cero o mayores.");

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    tenant_id: tenantId,
    sku: input.sku.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price: input.price,
    cv: input.cv,
    is_enrollment_package: input.isEnrollmentPackage,
  });
  if (error) throw new Error(error.code === "23505" ? `Ya existe un producto con el SKU "${input.sku}".` : error.message);
}

export async function updateProduct(
  id: string,
  patch: Partial<{ name: string; description: string; price: number; cv: number; isEnrollmentPackage: boolean; isActive: boolean }>
) {
  const tenantId = await requireTenant();
  await assertOwnerOrAdmin(tenantId);

  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.description !== undefined) row.description = patch.description.trim() || null;
  if (patch.price !== undefined) {
    if (!(patch.price >= 0)) throw new Error("Precio inválido.");
    row.price = patch.price;
  }
  if (patch.cv !== undefined) {
    if (!(patch.cv >= 0)) throw new Error("CV inválido.");
    row.cv = patch.cv;
  }
  if (patch.isEnrollmentPackage !== undefined) row.is_enrollment_package = patch.isEnrollmentPackage;
  if (patch.isActive !== undefined) row.is_active = patch.isActive;
  if (Object.keys(row).length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from("products").update(row).eq("id", id).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

// ---------- INSTRUCCIONES DE PAGO ----------
// Mientras no haya procesador de pagos conectado, la compañía cobra por fuera
// (transferencia, depósito, efectivo) y confirma el pago a mano. Este texto se
// le muestra al distribuidor al hacer su pedido o inscribirse.

export async function getPaymentInstructions(): Promise<string> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return "";
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("settings").eq("id", tenantId).maybeSingle();
  return ((data?.settings as any)?.paymentInstructions as string) ?? "";
}

export async function setPaymentInstructions(text: string) {
  const tenantId = await requireTenant();
  await assertOwnerOrAdmin(tenantId);
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("settings").eq("id", tenantId).maybeSingle();
  const settings = { ...((data?.settings as object) ?? {}), paymentInstructions: text.trim() };
  const { error } = await supabase.from("tenants").update({ settings }).eq("id", tenantId);
  if (error) throw new Error(error.message);
}

// ---------- PEDIDOS ----------

export interface OrderRow {
  id: string;
  number: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  source: "ADMIN" | "PORTAL" | "ENROLLMENT";
  totalPrice: number;
  totalCv: number;
  paymentMethod: string | null;
  createdAt: string;
  paidAt: string | null;
  distributorName: string;
  distributorCode: string;
}

export async function getOrders(limit = 300): Promise<{ orders: OrderRow[]; isDemo: boolean }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { orders: [], isDemo: true };
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, number, status, source, total_price, total_cv, payment_method, created_at, paid_at, distributors(full_name, code)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    orders: (data ?? []).map((o: any) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      source: o.source,
      totalPrice: Number(o.total_price),
      totalCv: Number(o.total_cv),
      paymentMethod: o.payment_method,
      createdAt: o.created_at,
      paidAt: o.paid_at,
      distributorName: o.distributors?.full_name ?? "—",
      distributorCode: o.distributors?.code ?? "",
    })),
    isDemo: false,
  };
}

export async function createAdminOrder(input: {
  distributorId: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod?: string;
  note?: string;
  markPaid?: boolean;
}): Promise<{ number: number }> {
  const tenantId = await requireTenant();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: dist } = await supabase.from("distributors").select("id").eq("id", input.distributorId).eq("tenant_id", tenantId).maybeSingle();
  if (!dist) throw new Error("El distribuidor no existe.");

  const catalog = (await getProducts()).products;
  // Un pedido del equipo puede incluir paquetes de inscripción (ej. para un upgrade).
  const { lines, totalPrice, totalCv } = buildOrderLines(catalog, input.items, { allowEnrollmentPackages: true });

  const order = await insertOrderWithItems(supabase, {
    tenantId,
    distributorId: input.distributorId,
    source: "ADMIN",
    createdBy: user?.id ?? null,
    paymentMethod: input.paymentMethod?.trim() || null,
    note: input.note?.trim() || null,
    lines,
    totalPrice,
    totalCv,
  });

  if (input.markPaid) await markOrderPaid(order.id);
  return { number: order.number };
}

export async function markOrderPaid(orderId: string) {
  const tenantId = await requireTenant();
  const supabase = await createClient();
  const period = await getOrCreateOpenPeriod(tenantId);
  const { error } = await supabase.rpc("mark_order_paid", { p_order_id: orderId, p_period_id: period.id });
  if (error) throw new Error(error.message);
  await recordUsageEvent(tenantId, USAGE_EVENT_TYPES.ORDER_PROCESSED, 1, { orderId });
}

export async function cancelOrder(orderId: string) {
  const tenantId = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "CANCELLED" })
    .eq("id", orderId)
    .eq("tenant_id", tenantId)
    .eq("status", "PENDING")
    .select("id");
  if (error) throw new Error(error.message);
  // Un pedido ya pagado no se cancela aquí: ya generó volumen y no hay ajustes de periodos cerrados todavía.
  if (!data || data.length === 0) throw new Error("Solo se pueden cancelar pedidos pendientes de pago.");
}

// ---------- INSCRIPCIONES ----------

export interface EnrollmentRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  leg: "LEFT" | "RIGHT" | null;
  status: "PENDING" | "PAID" | "CANCELLED";
  createdAt: string;
  sponsorName: string;
  sponsorCode: string;
  packageName: string;
  packagePrice: number;
  packageCv: number;
}

export async function getEnrollments(limit = 200): Promise<{ enrollments: EnrollmentRow[]; isDemo: boolean }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { enrollments: [], isDemo: true };
  const supabase = await createClient();

  const { data } = await supabase
    .from("pending_enrollments")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  if (rows.length === 0) return { enrollments: [], isDemo: false };

  const sponsorIds = [...new Set(rows.map((r: any) => r.sponsor_id))];
  const productIds = [...new Set(rows.map((r: any) => r.product_id))];
  const [{ data: sponsors }, { data: products }] = await Promise.all([
    supabase.from("distributors").select("id, full_name, code").in("id", sponsorIds),
    supabase.from("products").select("id, name, price, cv").in("id", productIds),
  ]);
  const sponsorById = new Map((sponsors ?? []).map((s: any) => [s.id, s]));
  const productById = new Map((products ?? []).map((p: any) => [p.id, p]));

  return {
    enrollments: rows.map((r: any) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      leg: r.leg,
      status: r.status,
      createdAt: r.created_at,
      sponsorName: (sponsorById.get(r.sponsor_id) as any)?.full_name ?? "—",
      sponsorCode: (sponsorById.get(r.sponsor_id) as any)?.code ?? "",
      packageName: (productById.get(r.product_id) as any)?.name ?? "—",
      packagePrice: Number((productById.get(r.product_id) as any)?.price ?? 0),
      packageCv: Number((productById.get(r.product_id) as any)?.cv ?? 0),
    })),
    isDemo: false,
  };
}

export interface ConfirmEnrollmentResult {
  code: string;
  distributorId: string;
  inviteSent: boolean;
  inviteMessage?: string;
}

// Confirma el pago: crea al distribuidor ya colocado, su pedido de paquete y el
// volumen (CV del paquete), todo en una transacción. Luego le manda su acceso al portal.
export async function confirmEnrollment(enrollmentId: string): Promise<ConfirmEnrollmentResult> {
  const tenantId = await requireTenant();
  const supabase = await createClient();

  const { data: enr } = await supabase.from("pending_enrollments").select("*").eq("id", enrollmentId).eq("tenant_id", tenantId).maybeSingle();
  if (!enr) throw new Error("Inscripción no encontrada.");
  if (enr.status !== "PENDING") throw new Error(`La inscripción ya está ${enr.status}.`);

  const { config } = await getCompensationPlan();

  let rpcResult: { distributor_id: string; order_id: string } | null = null;
  let usedCode = "";
  for (let attempt = 0; attempt < 5 && !rpcResult; attempt++) {
    // Cada intento relee la red: si otra inscripción tomó el código o la
    // posición al mismo tiempo, el siguiente intento ya la ve ocupada.
    const network = await getNetworkStructure(tenantId);
    usedCode = nextDistributorCode(network.map((d) => d.code));

    let parentId: string | null = null;
    let leg: Leg | null = null;
    if (config.binary.enabled) {
      const chosen: Leg = (enr.leg as Leg | null) ?? chooseLeg(network, enr.sponsor_id);
      const slot = findPlacementSlot(network, enr.sponsor_id, chosen);
      parentId = slot.parentId;
      leg = slot.leg;
    }

    const period = await getOrCreateOpenPeriod(tenantId);
    const { data, error } = await supabase.rpc("confirm_enrollment", {
      p_enrollment_id: enrollmentId,
      p_period_id: period.id,
      p_code: usedCode,
      p_placement_parent_id: parentId,
      p_placement_leg: leg,
    });
    if (!error) {
      rpcResult = data as any;
      break;
    }
    if (error.code === "23505") continue; // código o posición ya tomados por otra inscripción simultánea
    throw new Error(error.message);
  }
  if (!rpcResult) throw new Error("No se pudo asignar un código o posición libre. Intenta de nuevo.");

  await recordUsageEvent(tenantId, USAGE_EVENT_TYPES.DISTRIBUTOR_REGISTERED, 1, { source: "enrollment" });
  await recordUsageEvent(tenantId, USAGE_EVENT_TYPES.ORDER_PROCESSED, 1, { source: "enrollment" });
  await runAutomationsForTrigger(tenantId, "distributor.created", {
    code: usedCode,
    fullName: enr.full_name,
    rank: config.ranks[0] ?? "Distribuidor",
  });

  // Acceso al portal (si falla, el distribuidor ya existe: se puede reenviar desde Distribuidores).
  let inviteSent = false;
  let inviteMessage: string | undefined;
  try {
    const admin = createAdminClient();
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(enr.email, {
      redirectTo: `${getSiteUrl()}/portal/accept-invite`,
    });
    if (inviteError || !invited.user) {
      inviteMessage = inviteError?.message ?? "No se pudo enviar la invitación.";
    } else {
      await admin.from("distributors").update({ user_id: invited.user.id }).eq("id", rpcResult.distributor_id).eq("tenant_id", tenantId);
      inviteSent = true;
    }
  } catch (e) {
    inviteMessage = e instanceof Error ? e.message : "No se pudo enviar la invitación.";
  }

  return { code: usedCode, distributorId: rpcResult.distributor_id, inviteSent, inviteMessage };
}

export async function cancelEnrollment(enrollmentId: string) {
  const tenantId = await requireTenant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pending_enrollments")
    .update({ status: "CANCELLED" })
    .eq("id", enrollmentId)
    .eq("tenant_id", tenantId)
    .eq("status", "PENDING")
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Solo se pueden cancelar inscripciones pendientes.");
}

// ---------- IMPORTACIÓN DE LA RED ----------

export async function prepareImport(csv: string): Promise<ImportValidation & { existingCount: number }> {
  const tenantId = await requireTenant();
  await assertOwnerOrAdmin(tenantId);
  const { config } = await getCompensationPlan();
  const network = await getNetworkStructure(tenantId);
  const validation = validateImport(csv, {
    existing: network.map((d) => ({ id: d.id, code: d.code, placementParentId: d.placementParentId, placementLeg: d.placementLeg })),
    ranks: config.ranks,
  });
  return { ...validation, existingCount: network.length };
}

export async function commitImport(csv: string): Promise<{ imported: number }> {
  const tenantId = await requireTenant();
  const validation = await prepareImport(csv); // revalida en el servidor: nunca se confía en el navegador
  if (validation.errors.length > 0) throw new Error("El archivo tiene errores; corrígelos antes de importar.");
  if (validation.rows.length === 0) throw new Error("No hay filas para importar.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_distributors", { p_tenant: tenantId, p_rows: validation.rows });
  if (error) {
    throw new Error(
      error.code === "23505"
        ? "Otra persona agregó distribuidores mientras importabas y chocan con tu archivo. Vuelve a validar."
        : error.message
    );
  }

  // Una importación NO dispara automatizaciones (evitaría miles de correos/webhooks),
  // pero sí queda registrada para la facturación por consumo.
  await recordUsageEvent(tenantId, USAGE_EVENT_TYPES.DISTRIBUTOR_REGISTERED, validation.rows.length, { source: "import" });
  return { imported: Number(data) };
}
