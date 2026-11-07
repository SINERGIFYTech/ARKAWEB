import { createClient } from "@/lib/supabase/server";

export const USAGE_EVENT_TYPES = {
  DISTRIBUTOR_REGISTERED: "DISTRIBUTOR_REGISTERED",
  ORDER_PROCESSED: "ORDER_PROCESSED", // pendiente: aún no existe un módulo de órdenes/finanzas real que lo dispare
  COMMISSION_RUN: "COMMISSION_RUN",
  GENEALOGY_QUERY: "GENEALOGY_QUERY",
} as const;

export type UsageEventType = (typeof USAGE_EVENT_TYPES)[keyof typeof USAGE_EVENT_TYPES];

// No lanza error si falla — medir uso nunca debe tumbar la acción real del usuario.
export async function recordUsageEvent(
  tenantId: string,
  eventType: UsageEventType,
  quantity: number = 1,
  metadata: Record<string, unknown> = {}
) {
  try {
    const supabase = await createClient();
    await supabase.from("usage_events").insert({
      tenant_id: tenantId,
      event_type: eventType,
      quantity,
      metadata,
    });
  } catch {
    // Medición best-effort — un fallo aquí no debe romper la operación real.
  }
}
