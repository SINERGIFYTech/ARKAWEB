import { NextResponse } from "next/server";
import { closeOpenPeriod } from "@/modules/rankflow/repository";

export async function POST() {
  try {
    const result = await closeOpenPeriod();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
