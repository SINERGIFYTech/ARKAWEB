import { NextResponse } from "next/server";
import { setPaymentInstructions } from "@/modules/store/repository";

export async function PUT(request: Request) {
  try {
    const { paymentInstructions } = await request.json();
    await setPaymentInstructions(String(paymentInstructions ?? ""));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 400 });
  }
}
