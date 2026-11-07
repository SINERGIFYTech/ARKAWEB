import { NextResponse } from "next/server";
import { getCurrentDistributor } from "@/lib/distributor-auth";
import { createPortalTicket } from "@/modules/portal/repository";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const distributor = await getCurrentDistributor();
    if (!distributor) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { subject, description } = await request.json();
    if (!subject?.trim()) return NextResponse.json({ error: "Falta el asunto" }, { status: 400 });

    await createPortalTicket(distributor, user.id, subject, description ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
