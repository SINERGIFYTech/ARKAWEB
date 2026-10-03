import { NextResponse } from "next/server";
import { createTicket } from "@/modules/support/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await createTicket({ subject: body.subject, description: body.description ?? "", priority: body.priority ?? "MEDIUM" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
