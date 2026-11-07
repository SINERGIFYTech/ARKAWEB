import { NextResponse } from "next/server";
import { prepareImport } from "@/modules/store/repository";

export async function POST(request: Request) {
  try {
    const { csv } = await request.json();
    const v = await prepareImport(String(csv ?? ""));
    return NextResponse.json({
      valid: v.errors.length === 0,
      count: v.rows.length,
      existingCount: v.existingCount,
      errors: v.errors.slice(0, 200),
      totalErrors: v.errors.length,
      warnings: v.warnings.slice(0, 50),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 400 });
  }
}
