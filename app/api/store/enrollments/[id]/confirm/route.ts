import { NextResponse } from "next/server";
import { confirmEnrollment } from "@/modules/store/repository";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await confirmEnrollment(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 400 });
  }
}
