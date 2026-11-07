import { NextResponse } from "next/server";
import { getGenealogyData, getCompensationPlan, applyRankUpdates } from "@/modules/rankflow/repository";
import { computeAllQualifications } from "@/modules/rankflow/rank-engine";

export async function POST() {
  try {
    const [{ distributors }, { config }] = await Promise.all([getGenealogyData(), getCompensationPlan()]);
    const qualifications = computeAllQualifications(distributors, config);
    const updates = qualifications
      .filter((q) => !q.matches)
      .map((q) => ({ id: q.distributor.id, rank: q.qualifiedRank, fullName: q.distributor.fullName, oldRank: q.currentRank }));

    await applyRankUpdates(updates);

    return NextResponse.json({ updated: updates.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
