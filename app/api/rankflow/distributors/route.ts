import { NextResponse } from "next/server";
import { createDistributor } from "@/modules/rankflow/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const distributor = await createDistributor({
      code: body.code,
      fullName: body.fullName,
      sponsorId: body.sponsorId ?? null,
      placementParentId: body.placementParentId ?? null,
      placementLeg: body.placementLeg ?? null,
    });
    return NextResponse.json({ distributor });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
