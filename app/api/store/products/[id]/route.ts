import { NextResponse } from "next/server";
import { updateProduct } from "@/modules/store/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await request.json();
    await updateProduct(id, {
      name: b.name,
      description: b.description,
      price: b.price === undefined ? undefined : Number(b.price),
      cv: b.cv === undefined ? undefined : Number(b.cv),
      isEnrollmentPackage: b.isEnrollmentPackage,
      isActive: b.isActive,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 400 });
  }
}
