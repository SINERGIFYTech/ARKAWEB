import { NextResponse } from "next/server";
import { payChristmasBonus } from "@/modules/rankflow/repository";

export async function POST(request: Request) {
  try {
    const { year } = await request.json();
    const result = await payChristmasBonus(Number(year));
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
