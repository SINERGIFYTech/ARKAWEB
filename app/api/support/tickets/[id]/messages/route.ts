import { NextResponse } from "next/server";
import { addTicketMessage } from "@/modules/support/repository";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { body } = await request.json();
    if (!body?.trim()) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    await addTicketMessage(id, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
