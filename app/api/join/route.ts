import { NextResponse } from "next/server";
import { createPendingEnrollment, JoinError, envReady } from "@/modules/store/public-repository";

// Endpoint PÚBLICO (sin sesión): valida todo del lado del servidor.
export async function POST(request: Request) {
  try {
    if (!envReady()) return NextResponse.json({ error: "El registro no está disponible." }, { status: 503 });
    const b = await request.json();

    // Campo trampa: los bots lo llenan, las personas no lo ven. Se responde "ok" sin guardar nada.
    if (typeof b.website === "string" && b.website.trim() !== "") return NextResponse.json({ ok: true, paymentInstructions: "" });

    const leg = b.leg === "LEFT" || b.leg === "RIGHT" ? b.leg : null;
    const result = await createPendingEnrollment({
      slug: String(b.slug ?? ""),
      code: String(b.code ?? ""),
      leg,
      fullName: String(b.fullName ?? ""),
      email: String(b.email ?? ""),
      phone: String(b.phone ?? ""),
      productId: String(b.productId ?? ""),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof JoinError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "No se pudo completar el registro." }, { status: 500 });
  }
}
