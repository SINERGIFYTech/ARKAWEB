import { NextResponse } from "next/server";
import { createInvoice } from "@/modules/finance/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await createInvoice({ clientName: body.clientName, amount: Number(body.amount), dueDate: body.dueDate });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
