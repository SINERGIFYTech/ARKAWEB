import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { getConfig } from "@/modules/portal/repository";

// Página pública de registro (/join/[empresa]/[código]). No hay sesión: todo se
// hace con el service role, devolviendo únicamente datos mínimos y no sensibles.

export class JoinError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

export interface JoinContext {
  tenantId: string;
  companyName: string;
  sponsorId: string;
  sponsorName: string;
  binaryEnabled: boolean;
  packages: Array<{ id: string; name: string; description: string | null; price: number }>;
}

export function envReady(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export async function getJoinContext(slug: string, code: string): Promise<JoinContext | null> {
  if (!envReady()) return null;
  const admin = createAdminClient();

  const { data: tenant } = await admin.from("tenants").select("id, name, status").eq("slug", slug).maybeSingle();
  if (!tenant || tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") return null;

  const { data: sponsor } = await admin
    .from("distributors")
    .select("id, full_name, status")
    .eq("tenant_id", tenant.id)
    .eq("code", code)
    .maybeSingle();
  if (!sponsor || sponsor.status === "SUSPENDED") return null;

  const rows = await fetchAll((a, b) =>
    admin
      .from("products")
      .select("id, name, description, price")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .eq("is_enrollment_package", true)
      .order("price")
      .order("id")
      .range(a, b)
  );
  const config = await getConfig(tenant.id);

  return {
    tenantId: tenant.id,
    companyName: tenant.name,
    sponsorId: sponsor.id,
    sponsorName: sponsor.full_name,
    binaryEnabled: config.binary.enabled,
    packages: rows.map((r: any) => ({ id: r.id, name: r.name, description: r.description, price: Number(r.price) })),
  };
}

export async function createPendingEnrollment(input: {
  slug: string;
  code: string;
  leg: "LEFT" | "RIGHT" | null;
  fullName: string;
  email: string;
  phone: string;
  productId: string;
}): Promise<{ paymentInstructions: string }> {
  const ctx = await getJoinContext(input.slug, input.code);
  if (!ctx) throw new JoinError("Este link de registro no es válido.", 404);

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (fullName.length < 3 || fullName.length > 120) throw new JoinError("Escribe tu nombre completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) throw new JoinError("Escribe un correo válido.");
  if (!ctx.packages.some((p) => p.id === input.productId)) throw new JoinError("Elige un paquete válido.");

  const admin = createAdminClient();

  // Freno básico contra abuso (no hay otro rate-limit en la plataforma todavía).
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("pending_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .gte("created_at", since);
  if ((count ?? 0) >= 30) throw new JoinError("Hay demasiadas solicitudes en este momento. Intenta de nuevo en un rato.", 429);

  // ¿Ya es distribuidor? (se escapan % y _ para que el correo se compare literal)
  const escaped = email.replace(/[\\%_]/g, (c) => "\\" + c);
  const { data: existing } = await admin.from("distributors").select("id").eq("tenant_id", ctx.tenantId).ilike("email", escaped).limit(1);
  if (existing && existing.length > 0) throw new JoinError("Ese correo ya pertenece a un distribuidor registrado.", 409);

  const { error } = await admin.from("pending_enrollments").insert({
    tenant_id: ctx.tenantId,
    sponsor_id: ctx.sponsorId,
    leg: ctx.binaryEnabled ? input.leg : null,
    full_name: fullName,
    email,
    phone: input.phone.trim().slice(0, 40) || null,
    product_id: input.productId,
  });
  if (error) {
    if (error.code === "23505") throw new JoinError("Ya hay una solicitud pendiente con ese correo.", 409);
    throw new JoinError("No se pudo registrar tu solicitud. Intenta de nuevo.", 500);
  }

  const { data: tenantRow } = await admin.from("tenants").select("settings").eq("id", ctx.tenantId).maybeSingle();
  return { paymentInstructions: ((tenantRow?.settings as any)?.paymentInstructions as string) ?? "" };
}
