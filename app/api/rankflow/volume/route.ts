import { NextResponse } from "next/server";
import { addVolumeEntry } from "@/modules/rankflow/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addVolumeEntry({
      distributorId: body.distributorId,
      amount: Number(body.amount),
      note: body.note,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
