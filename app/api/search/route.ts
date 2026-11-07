import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";

export interface SearchResult {
  type: "distributor" | "ticket" | "invoice";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ results: [] }); // sin buscador en modo demo

  const supabase = await createClient();
  const results: SearchResult[] = [];

  const [{ data: distributors }, { data: tickets }, { data: invoices }] = await Promise.all([
    supabase
      .from("distributors")
      .select("id, full_name, code")
      .eq("tenant_id", tenantId)
      .or(`full_name.ilike.%${q}%,code.ilike.%${q}%`)
      .limit(5),
    supabase.from("tickets").select("id, subject, status").eq("tenant_id", tenantId).ilike("subject", `%${q}%`).limit(5),
    supabase.from("invoices").select("id, client_name, amount").eq("tenant_id", tenantId).ilike("client_name", `%${q}%`).limit(5),
  ]);

  for (const d of distributors ?? []) {
    results.push({
      type: "distributor",
      id: d.id,
      title: d.full_name,
      subtitle: d.code,
      href: "/dashboard/rankflow/genealogy",
    });
  }
  for (const t of tickets ?? []) {
    results.push({ type: "ticket", id: t.id, title: t.subject, subtitle: t.status, href: `/dashboard/support/${t.id}` });
  }
  for (const i of invoices ?? []) {
    results.push({
      type: "invoice",
      id: i.id,
      title: i.client_name,
      subtitle: `$${Number(i.amount).toLocaleString("es-MX")}`,
      href: "/dashboard/finance",
    });
  }

  return NextResponse.json({ results });
}
