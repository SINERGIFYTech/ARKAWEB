import { getPlacementChildren, type DistributorNode } from "@/modules/rankflow/data";

export type Leg = "LEFT" | "RIGHT";

// Posición libre al FINAL de la pierna elegida: se baja siguiendo siempre esa
// misma pierna hasta encontrar un hueco (derrame hacia el extremo).
// Nota: la lista no debe modificarse después de llamar (ver índice en data.ts).
export function findPlacementSlot(list: DistributorNode[], sponsorId: string, leg: Leg): { parentId: string; leg: Leg } {
  let parentId = sponsorId;
  for (let guard = 0; guard <= list.length + 1; guard++) {
    const child = getPlacementChildren(list, parentId).find((c) => c.placementLeg === leg);
    if (!child) return { parentId, leg };
    parentId = child.id;
  }
  throw new Error("No se encontró una posición libre en el binario.");
}

// Si el link no trae pierna: la que tenga menos gente colocada debajo.
export function chooseLeg(list: DistributorNode[], sponsorId: string): Leg {
  function countBelow(rootId: string): number {
    let count = 0;
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop()!;
      for (const c of getPlacementChildren(list, id)) {
        count++;
        stack.push(c.id);
      }
    }
    return count;
  }
  const kids = getPlacementChildren(list, sponsorId);
  const left = kids.find((c) => c.placementLeg === "LEFT");
  const right = kids.find((c) => c.placementLeg === "RIGHT");
  const l = left ? 1 + countBelow(left.id) : 0;
  const r = right ? 1 + countBelow(right.id) : 0;
  return r < l ? "RIGHT" : "LEFT";
}

// Siguiente código de distribuidor respetando el esquema que ya usan
// ("00012" → "00013", "DZ-10040" → "DZ-10041"). Si no hay ninguno, "00001".
export function nextDistributorCode(existingCodes: string[]): string {
  const byPrefix = new Map<string, { count: number; max: number; width: number }>();
  for (const code of existingCodes) {
    const m = /^(\D*)(\d+)$/.exec(code.trim());
    if (!m) continue;
    const prefix = m[1];
    const num = Number(m[2]);
    const cur = byPrefix.get(prefix) ?? { count: 0, max: 0, width: 0 };
    cur.count++;
    cur.max = Math.max(cur.max, num);
    cur.width = Math.max(cur.width, m[2].length);
    byPrefix.set(prefix, cur);
  }
  if (byPrefix.size === 0) return "00001";

  let bestPrefix = "";
  let best = { count: -1, max: 0, width: 5 };
  for (const [prefix, v] of byPrefix) {
    if (v.count > best.count) {
      best = v;
      bestPrefix = prefix;
    }
  }
  return bestPrefix + String(best.max + 1).padStart(best.width, "0");
}
