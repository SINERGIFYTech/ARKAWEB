import { NextResponse } from "next/server";
import { createAdminOrder } from "@/modules/store/repository";

export async function POST(request: Request) {
  try {
    const b = await request.json();
    const result = await createAdminOrder({
      distributorId: String(b.distributorId ?? ""),
      items: Array.isArray(b.items) ? b.items.map((i: any) => ({ productId: String(i.productId), quantity: Number(i.quantity) })) : [],
      paymentMethod: b.paymentMethod,
      note: b.note,
      markPaid: !!b.markPaid,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 400 });
  }
}
