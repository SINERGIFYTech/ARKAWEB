import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { runAutomationsForTrigger } from "@/modules/automations/repository";

export interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  body: string;
  createdAt: string;
  authorEmail: string;
}

const demoTickets: Ticket[] = [
  { id: "1", subject: "No puedo activar el módulo de Inventario", description: "Al hacer clic no pasa nada.", priority: "HIGH", status: "OPEN", createdAt: new Date().toISOString() },
  { id: "2", subject: "Duda sobre facturación del plan Pro", description: null, priority: "MEDIUM", status: "IN_PROGRESS", createdAt: new Date().toISOString() },
  { id: "3", subject: "Solicitud de nuevo rol personalizado", description: null, priority: "LOW", status: "CLOSED", createdAt: new Date().toISOString() },
];

export async function getTickets(): Promise<{ tickets: Ticket[]; isDemo: boolean }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { tickets: demoTickets, isDemo: true };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("id, subject, description, status, priority, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error || !data) return { tickets: [], isDemo: false };

  return {
    tickets: data.map((t) => ({
      id: t.id,
      subject: t.subject,
      description: t.description,
      status: t.status,
      priority: t.priority,
      createdAt: t.created_at,
    })),
    isDemo: false,
  };
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return demoTickets.find((t) => t.id === id) ?? null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("id, subject, description, status, priority, created_at")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    subject: data.subject,
    description: data.description,
    status: data.status,
    priority: data.priority,
    createdAt: data.created_at,
  };
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("ticket_messages")
    .select("id, body, created_at, users(email)")
    .eq("tenant_id", tenantId)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((m: any) => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    authorEmail: m.users?.email ?? "—",
  }));
}

export async function createTicket(input: { subject: string; description: string; priority: Ticket["priority"] }) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada — conecta Supabase para crear tickets reales.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("tickets").insert({
    tenant_id: tenantId,
    subject: input.subject,
    description: input.description || null,
    priority: input.priority,
    created_by: user?.id ?? null,
  });

  if (error) throw new Error(error.message);

  await runAutomationsForTrigger(tenantId, "ticket.created", { subject: input.subject, priority: input.priority });
}

export async function updateTicketStatus(id: string, status: Ticket["status"]) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}

export async function addTicketMessage(ticketId: string, body: string) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("ticket_messages").insert({
    tenant_id: tenantId,
    ticket_id: ticketId,
    user_id: user?.id ?? null,
    body,
  });

  if (error) throw new Error(error.message);
}
