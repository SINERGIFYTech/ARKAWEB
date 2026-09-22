import { NextResponse } from "next/server";
import { saveCompensationPlan } from "@/modules/rankflow/repository";
import type { CompensationPlanConfig } from "@/modules/rankflow/plan-config";

export async function POST(request: Request) {
  try {
    const config = (await request.json()) as CompensationPlanConfig;

    if (!Array.isArray(config.ranks) || config.ranks.length === 0) {
      return NextResponse.json({ error: "Debe haber al menos un rango" }, { status: 400 });
    }
    if (!config.binary.enabled && !config.unilevel.enabled && !config.generation.enabled) {
      return NextResponse.json({ error: "Activa al menos un componente del plan (binario, unilevel o generacional)" }, { status: 400 });
    }

    await saveCompensationPlan(config);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
