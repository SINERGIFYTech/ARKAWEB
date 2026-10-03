import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";

export interface Invoice {
  id: string;
  clientName: string;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  dueDate: string;
}

const demoInvoices: Invoice[] = [
  { id: "1", clientName: "Grupo Alfa", amount: 45000, status: "PAID", dueDate: "2026-07-12" },
  { id: "2", clientName: "Nova Textiles", amount: 12000, status: "PENDING", dueDate: "2026-07-15" },
  { id: "3", clientName: "Bright Clinics", amount: 78000, status: "OVERDUE", dueDate: "2026-07-01" },
  { id: "4", clientName: "Constructora Sur", amount: 152000, status: "PAID", dueDate: "2026-07-20" },
];

export async function getInvoices(): Promise<{ invoices: Invoice[]; isDemo: boolean }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { invoices: demoInvoices, isDemo: true };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, client_name, amount, status, due_date")
    .eq("tenant_id", tenantId)
    .order("due_date", { ascending: false });

  if (error || !data) return { invoices: [], isDemo: false };

  return {
    invoices: data.map((i) => ({
      id: i.id,
      clientName: i.client_name,
      amount: Number(i.amount),
      status: i.status,
      dueDate: i.due_date,
    })),
    isDemo: false,
  };
}

export async function createInvoice(input: { clientName: string; amount: number; dueDate: string }) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada — conecta Supabase para crear facturas reales.");

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").insert({
    tenant_id: tenantId,
    client_name: input.clientName,
    amount: input.amount,
    due_date: input.dueDate,
  });

  if (error) throw new Error(error.message);
}

export async function markInvoiceStatus(id: string, status: Invoice["status"]) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Base de datos no configurada.");

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id).eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}
