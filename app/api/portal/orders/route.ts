import { NextResponse } from "next/server";
import { getCurrentDistributor } from "@/lib/distributor-auth";
import { createClient } from "@/lib/supabase/server";
import { createPortalOrder } from "@/modules/store/portal-repository";

export async function POST(request: Request) {
  try {
    const distributor = await getCurrentDistributor();
    if (!distributor) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const b = await request.json();
    const items = Array.isArray(b.items) ? b.items.map((i: any) => ({ productId: String(i.productId), quantity: Number(i.quantity) })) : [];
    const result = await createPortalOrder(distributor, user.id, items);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 400 });
  }
}
