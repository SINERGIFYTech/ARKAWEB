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

// ==========================================
// Índice de la red. Cada función de árbol antes recorría TODA la lista en cada
// llamada (O(n) por nodo → O(n²) o peor al calcular comisiones); con miles de
// distribuidores eso tarda minutos. Aquí se construye UNA vez por lista (se
// guarda por identidad del arreglo) y todo pasa a ser de tiempo lineal.
// IMPORTANTE: la lista no se debe modificar después de la primera consulta
// (asignar personalVolume antes de usarla, como ya se hace en los repositorios).
// ==========================================
interface NetworkIndex {
  byId: Map<string, DistributorNode>;
  placementChildren: Map<string, DistributorNode[]>;
  sponsoredChildren: Map<string, DistributorNode[]>;
  legVolume: Map<string, number>;
  subtreeVolume: Map<string, number>;
}

const indexes = new WeakMap<DistributorNode[], NetworkIndex>();

function getIndex(list: DistributorNode[]): NetworkIndex {
  let idx = indexes.get(list);
  if (idx) return idx;

  idx = {
    byId: new Map(),
    placementChildren: new Map(),
    sponsoredChildren: new Map(),
    legVolume: new Map(),
    subtreeVolume: new Map(),
  };
  for (const d of list) {
    idx.byId.set(d.id, d);
    if (d.placementParentId) {
      const arr = idx.placementChildren.get(d.placementParentId);
      if (arr) arr.push(d);
      else idx.placementChildren.set(d.placementParentId, [d]);
    }
    if (d.sponsorId) {
      const arr = idx.sponsoredChildren.get(d.sponsorId);
      if (arr) arr.push(d);
      else idx.sponsoredChildren.set(d.sponsorId, [d]);
    }
  }
  indexes.set(list, idx);
  return idx;
}

export function findById(list: DistributorNode[], id: string): DistributorNode | null {
  return getIndex(list).byId.get(id) ?? null;
}

export function getPlacementChildren(list: DistributorNode[], id: string): DistributorNode[] {
  return getIndex(list).placementChildren.get(id) ?? [];
}

export function getSponsoredChildren(list: DistributorNode[], id: string): DistributorNode[] {
  return getIndex(list).sponsoredChildren.get(id) ?? [];
}

// Volumen acumulado de una pierna del binario (incluye al propio nodo y a todos sus descendientes por colocación).
export function getLegVolume(list: DistributorNode[], id: string): number {
  const idx = getIndex(list);
  const cached = idx.legVolume.get(id);
  if (cached !== undefined) return cached;

  idx.legVolume.set(id, 0); // corta ciclos de datos corruptos en vez de colgarse
  const node = idx.byId.get(id);
  if (!node) return 0;
  let total = node.personalVolume;
  for (const child of idx.placementChildren.get(id) ?? []) total += getLegVolume(list, child.id);
  idx.legVolume.set(id, total);
  return total;
}

// Volumen total del equipo de patrocinio (incluye al propio nodo).
// Se usa para comisiones unilevel/generacionales y para calificación de rangos.
export function getSponsorSubtreeVolume(list: DistributorNode[], id: string): number {
  const idx = getIndex(list);
  const cached = idx.subtreeVolume.get(id);
  if (cached !== undefined) return cached;

  idx.subtreeVolume.set(id, 0);
  const node = idx.byId.get(id);
  if (!node) return 0;
  let total = node.personalVolume;
  for (const child of idx.sponsoredChildren.get(id) ?? []) total += getSponsorSubtreeVolume(list, child.id);
  idx.subtreeVolume.set(id, total);
  return total;
}
