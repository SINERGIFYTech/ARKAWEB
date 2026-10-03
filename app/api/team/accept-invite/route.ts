import { NextResponse } from "next/server";
import { acceptOwnInvite } from "@/modules/team/repository";

export async function POST() {
  try {
    await acceptOwnInvite();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
