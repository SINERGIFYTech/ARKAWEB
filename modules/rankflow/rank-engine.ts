import { getSponsorSubtreeVolume, findById, type DistributorNode } from "@/modules/rankflow/data";
import type { CompensationPlanConfig } from "@/modules/rankflow/plan-config";

export interface RankQualification {
  distributor: DistributorNode;
  personalVolume: number;
  teamVolume: number;
  currentRank: string;
  qualifiedRank: string;
  matches: boolean; // si el rango guardado coincide con el que le corresponde por volumen
}

// Recorre los rangos de menor a mayor y devuelve el más alto que el volumen alcanza.
// Si no califica para ninguno con requisito > 0, cae en el primer rango de la lista.
export function computeQualifiedRank(
  distributors: DistributorNode[],
  config: CompensationPlanConfig,
  distributorId: string
): RankQualification | null {
  const self = findById(distributors, distributorId);
  if (!self) return null;

  const personalVolume = self.personalVolume;
  const teamVolume = getSponsorSubtreeVolume(distributors, distributorId);

  let qualifiedRank = config.ranks[0] ?? self.rank;
  for (const rank of config.ranks) {
    const req = config.rankRequirements[rank] ?? { personalVolume: 0, teamVolume: 0 };
    if (personalVolume >= req.personalVolume && teamVolume >= req.teamVolume) {
      qualifiedRank = rank; // sigue avanzando mientras califique, se queda con el más alto
    }
  }

  return {
    distributor: self,
    personalVolume,
    teamVolume,
    currentRank: self.rank,
    qualifiedRank,
    matches: self.rank === qualifiedRank,
  };
}

export function computeAllQualifications(
  distributors: DistributorNode[],
  config: CompensationPlanConfig
): RankQualification[] {
  return distributors
    .map((d) => computeQualifiedRank(distributors, config, d.id))
    .filter((q): q is RankQualification => q !== null);
}
