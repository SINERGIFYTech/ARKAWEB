import { NextResponse } from "next/server";
import { inviteMember } from "@/modules/team/repository";

export async function POST(request: Request) {
  try {
    const { email, roleId } = await request.json();
    if (!email || !roleId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    await inviteMember({ email, roleId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
