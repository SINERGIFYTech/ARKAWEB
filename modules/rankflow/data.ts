export interface DistributorNode {
  id: string;
  code: string;
  fullName: string;
  rank: string;
  personalVolume: number;
  status: "ACTIVE" | "INACTIVE";
  sponsorId: string | null; // árbol de patrocinio (unilevel/generaciones)
  placementParentId: string | null; // árbol de colocación (binario)
  placementLeg: "LEFT" | "RIGHT" | null;
}

// 15 distribuidores de ejemplo — se usan solo cuando no hay base de datos conectada.
// Nota cómo el patrocinio y la colocación NO siempre coinciden — así se comporta
// un plan híbrido real: alguien puede patrocinar a una persona que el sistema
// coloca en otra pierna del binario.
export const mockDistributors: DistributorNode[] = [
  { id: "1", code: "DZ-10001", fullName: "Zuard M.", rank: "Diamante", personalVolume: 4200, status: "ACTIVE", sponsorId: null, placementParentId: null, placementLeg: null },

  { id: "2", code: "DZ-10002", fullName: "Ana Reyes", rank: "Esmeralda", personalVolume: 2100, status: "ACTIVE", sponsorId: "1", placementParentId: "1", placementLeg: "LEFT" },
  { id: "3", code: "DZ-10003", fullName: "Luis Cano", rank: "Esmeralda", personalVolume: 1980, status: "ACTIVE", sponsorId: "1", placementParentId: "1", placementLeg: "RIGHT" },

  { id: "4", code: "DZ-10004", fullName: "Diego Ríos", rank: "Rubí", personalVolume: 950, status: "ACTIVE", sponsorId: "2", placementParentId: "2", placementLeg: "LEFT" },
  { id: "5", code: "DZ-10005", fullName: "Fernanda Ye", rank: "Rubí", personalVolume: 1100, status: "ACTIVE", sponsorId: "2", placementParentId: "2", placementLeg: "RIGHT" },
  { id: "6", code: "DZ-10006", fullName: "Sofía Vega", rank: "Plata", personalVolume: 430, status: "ACTIVE", sponsorId: "3", placementParentId: "3", placementLeg: "LEFT" },
  { id: "7", code: "DZ-10007", fullName: "Jorge Peña", rank: "Plata", personalVolume: 380, status: "ACTIVE", sponsorId: "3", placementParentId: "3", placementLeg: "RIGHT" },

  { id: "8", code: "DZ-10008", fullName: "María Torres", rank: "Bronce", personalVolume: 210, status: "ACTIVE", sponsorId: "4", placementParentId: "4", placementLeg: "LEFT" },
  { id: "9", code: "DZ-10009", fullName: "Carlos Ruiz", rank: "Bronce", personalVolume: 190, status: "INACTIVE", sponsorId: "4", placementParentId: "4", placementLeg: "RIGHT" },
  { id: "10", code: "DZ-10010", fullName: "Ricardo Peña", rank: "Bronce", personalVolume: 260, status: "ACTIVE", sponsorId: "5", placementParentId: "5", placementLeg: "LEFT" },
  { id: "11", code: "DZ-10011", fullName: "Paula Nieto", rank: "Distribuidor", personalVolume: 90, status: "ACTIVE", sponsorId: "5", placementParentId: "5", placementLeg: "RIGHT" },

  { id: "12", code: "DZ-10012", fullName: "Iván Salas", rank: "Distribuidor", personalVolume: 70, status: "ACTIVE", sponsorId: "6", placementParentId: "6", placementLeg: "LEFT" },
  { id: "13", code: "DZ-10013", fullName: "Gaby Cortés", rank: "Distribuidor", personalVolume: 60, status: "ACTIVE", sponsorId: "7", placementParentId: "7", placementLeg: "LEFT" },
  { id: "14", code: "DZ-10014", fullName: "Toño Vidal", rank: "Distribuidor", personalVolume: 40, status: "INACTIVE", sponsorId: "1", placementParentId: "8", placementLeg: "LEFT" },
  { id: "15", code: "DZ-10015", fullName: "Lupita Solís", rank: "Distribuidor", personalVolume: 55, status: "ACTIVE", sponsorId: "1", placementParentId: "8", placementLeg: "RIGHT" },
];

// ==========================================
// Helpers de genealogía — trabajan sobre CUALQUIER lista de distribuidores
// (mock o traída de la base de datos real). Así el mismo código de árbol
// y de comisiones sirve para el modo demo y para producción.
// ==========================================

export function findById(list: DistributorNode[], id: string): DistributorNode | null {
  return list.find((d) => d.id === id) ?? null;
}

export function getPlacementChildren(list: DistributorNode[], id: string): DistributorNode[] {
  return list.filter((d) => d.placementParentId === id);
}

export function getSponsoredChildren(list: DistributorNode[], id: string): DistributorNode[] {
  return list.filter((d) => d.sponsorId === id);
}

// Volumen acumulado de una pierna del binario (recursivo, incluye personalVolume de todos los descendientes)
export function getLegVolume(list: DistributorNode[], id: string): number {
  const node = findById(list, id);
  if (!node) return 0;
  const children = getPlacementChildren(list, id);
  return node.personalVolume + children.reduce((sum, child) => sum + getLegVolume(list, child.id), 0);
}
