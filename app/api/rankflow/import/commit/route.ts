import { NextResponse } from "next/server";
import { commitImport } from "@/modules/store/repository";

export async function POST(request: Request) {
  try {
    const { csv } = await request.json();
    const result = await commitImport(String(csv ?? ""));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 400 });
  }
}
