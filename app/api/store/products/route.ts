import { NextResponse } from "next/server";
import { createProduct } from "@/modules/store/repository";

export async function POST(request: Request) {
  try {
    const b = await request.json();
    await createProduct({
      sku: String(b.sku ?? ""),
      name: String(b.name ?? ""),
      description: b.description,
      price: Number(b.price),
      cv: Number(b.cv),
      isEnrollmentPackage: !!b.isEnrollmentPackage,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 400 });
  }
}
