import { NextResponse } from "next/server";
import { createAutomationRule } from "@/modules/automations/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await createAutomationRule({
      name: body.name,
      triggerType: body.triggerType,
      isEnabled: body.isEnabled ?? true,
      conditions: body.conditions ?? [],
      actions: body.actions ?? [],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
