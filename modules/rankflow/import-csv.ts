// Importación de la red: lee el CSV, valida TODO antes de tocar la base de
// datos y devuelve filas ya resueltas (con ids) listas para import_distributors().
// Si hay un solo error, no se importa nada.

export const MAX_IMPORT_ROWS = 5000;

export interface ImportRowResolved {
  id: string;
  code: string;
  full_name: string;
  email: string | null;
  sponsor_id: string | null;
  placement_parent_id: string | null;
  placement_leg: "LEFT" | "RIGHT" | null;
  rank: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  joined_at: string | null;
}

export interface ImportIssue {
  line: number; // número de línea del archivo (el encabezado es la 1)
  message: string;
}

export interface ImportValidation {
  rows: ImportRowResolved[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

export interface ImportContext {
  existing: Array<{ id: string; code: string; placementParentId: string | null; placementLeg: string | null }>;
  ranks: string[];
  newId?: () => string;
  maxRows?: number;
}

// ---------- CSV ----------
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const counts = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch as keyof typeof counts]++;
  const delimiter = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as string) || ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-\.]+/g, "_");
}

const ALIASES: Record<string, string[]> = {
  code: ["code", "codigo", "id", "id_distribuidor", "distributor_id", "no_distribuidor", "numero_distribuidor"],
  full_name: ["full_name", "nombre", "nombre_completo", "name"],
  email: ["email", "correo", "correo_electronico", "e_mail", "mail"],
  sponsor: ["sponsor", "sponsor_code", "patrocinador", "codigo_patrocinador", "id_patrocinador", "upline"],
  placement_parent: ["placement_parent", "placement", "colocacion", "colocado_bajo", "padre_binario", "codigo_colocacion", "binario_padre"],
  leg: ["leg", "pierna", "lado", "side"],
  rank: ["rank", "rango"],
  status: ["status", "estado", "estatus"],
  joined_at: ["joined_at", "fecha_ingreso", "fecha_de_ingreso", "fecha", "ingreso", "fecha_inscripcion"],
};

function mapHeaders(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((h, idx) => {
    const n = normalizeHeader(h);
    for (const [field, names] of Object.entries(ALIASES)) {
      if (names.includes(n) && map[field] === undefined) map[field] = idx;
    }
  });
  return map;
}

function parseLeg(v: string): "LEFT" | "RIGHT" | null | "INVALID" {
  const n = normalizeHeader(v);
  if (!n) return null;
  if (["left", "l", "izq", "izquierda", "izquierdo", "a", "lado_a"].includes(n)) return "LEFT";
  if (["right", "r", "der", "derecha", "derecho", "b", "lado_b"].includes(n)) return "RIGHT";
  return "INVALID";
}

function parseStatus(v: string): "ACTIVE" | "INACTIVE" | "SUSPENDED" | null | "INVALID" {
  const n = normalizeHeader(v);
  if (!n) return null;
  if (["active", "activo", "activa", "1", "si", "true"].includes(n)) return "ACTIVE";
  if (["inactive", "inactivo", "inactiva", "0", "no", "false"].includes(n)) return "INACTIVE";
  if (["suspended", "suspendido", "suspendida"].includes(n)) return "SUSPENDED";
  return "INVALID";
}

function parseDate(v: string): string | null | "INVALID" {
  const t = v.trim();
  if (!t) return null;
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (match) {
    y = +match[1];
    m = +match[2];
    d = +match[3];
  } else if ((match = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(t))) {
    // formato latino día/mes/año
    d = +match[1];
    m = +match[2];
    y = +match[3];
  } else return "INVALID";
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "INVALID";
  return date.toISOString();
}

// Detecta ciclos en un grafo "hijo → padre" (solo dentro del archivo).
function findCycleMembers(parentOf: Map<string, string>): Set<string> {
  const state = new Map<string, 0 | 1 | 2>(); // 1 = en curso, 2 = terminado
  const inCycle = new Set<string>();
  for (const start of parentOf.keys()) {
    if (state.get(start) === 2) continue;
    const path: string[] = [];
    let cur: string | undefined = start;
    while (cur !== undefined && state.get(cur) !== 2) {
      if (state.get(cur) === 1) {
        const idx = path.indexOf(cur);
        for (const n of path.slice(idx)) inCycle.add(n);
        break;
      }
      state.set(cur, 1);
      path.push(cur);
      cur = parentOf.get(cur);
    }
    for (const n of path) state.set(n, 2);
  }
  return inCycle;
}

export function validateImport(csvText: string, ctx: ImportContext): ImportValidation {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const newId = ctx.newId ?? (() => crypto.randomUUID());
  const maxRows = ctx.maxRows ?? MAX_IMPORT_ROWS;

  if (csvText.includes("\uFFFD")) {
    warnings.push({ line: 1, message: "El archivo tiene caracteres ilegibles: guárdalo como CSV UTF-8 para que los acentos se importen bien." });
  }

  const table = parseCsv(csvText).filter((r) => r.some((c) => c.trim() !== ""));
  if (table.length < 2) {
    return { rows: [], errors: [{ line: 1, message: "El archivo está vacío o solo trae el encabezado." }], warnings };
  }

  const headers = mapHeaders(table[0]);
  for (const required of ["code", "full_name"] as const) {
    if (headers[required] === undefined) {
      errors.push({ line: 1, message: `Falta la columna obligatoria "${required === "code" ? "codigo" : "nombre"}".` });
    }
  }
  if (errors.length) return { rows: [], errors, warnings };

  const dataRows = table.slice(1);
  if (dataRows.length > maxRows) {
    return {
      rows: [],
      errors: [{ line: 1, message: `El archivo trae ${dataRows.length} filas; el máximo por importación es ${maxRows}. Divídelo poniendo primero a los patrocinadores.` }],
      warnings,
    };
  }

  const cell = (r: string[], f: string) => (headers[f] === undefined ? "" : (r[headers[f]] ?? "").trim());

  // Registros existentes
  const existingByCode = new Map(ctx.existing.map((e) => [e.code, e]));
  const occupiedSlots = new Set(
    ctx.existing.filter((e) => e.placementParentId && e.placementLeg).map((e) => `${e.placementParentId}:${e.placementLeg}`)
  );

  // Pasada 1: ids por código (y duplicados)
  const idByCode = new Map<string, string>();
  const lineByCode = new Map<string, number>();
  const parsed: Array<{ line: number; r: string[]; code: string }> = [];
  dataRows.forEach((r, i) => {
    const line = i + 2;
    const code = cell(r, "code");
    if (!code) {
      errors.push({ line, message: "Falta el código del distribuidor." });
      return;
    }
    if (idByCode.has(code)) {
      errors.push({ line, message: `El código "${code}" está repetido (ya aparece en la línea ${lineByCode.get(code)}).` });
      return;
    }
    if (existingByCode.has(code)) {
      errors.push({ line, message: `El código "${code}" ya existe en tu red.` });
      return;
    }
    idByCode.set(code, newId());
    lineByCode.set(code, line);
    parsed.push({ line, r, code });
  });

  const resolveRef = (code: string): string | null => idByCode.get(code) ?? existingByCode.get(code)?.id ?? null;

  const rows: ImportRowResolved[] = [];
  const sponsorOf = new Map<string, string>(); // para ciclos (solo ids del archivo)
  const placementOf = new Map<string, string>();
  const fileSlots = new Map<string, number>();
  const rankSet = new Set(ctx.ranks);
  let roots = 0;

  for (const { line, r, code } of parsed) {
    const startErrors = errors.length;
    const fullName = cell(r, "full_name");
    if (!fullName) errors.push({ line, message: `El distribuidor "${code}" no tiene nombre.` });

    const email = cell(r, "email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ line, message: `Correo inválido: "${email}".` });

    // patrocinador
    const sponsorCode = cell(r, "sponsor");
    let sponsorId: string | null = null;
    if (sponsorCode) {
      sponsorId = resolveRef(sponsorCode);
      if (!sponsorId) errors.push({ line, message: `El patrocinador "${sponsorCode}" no existe ni en el archivo ni en tu red.` });
      else if (sponsorCode === code) errors.push({ line, message: "Un distribuidor no puede ser su propio patrocinador." });
    } else roots++;

    // colocación
    const parentCode = cell(r, "placement_parent");
    const legRaw = parseLeg(cell(r, "leg"));
    let parentId: string | null = null;
    let leg: "LEFT" | "RIGHT" | null = null;
    if (legRaw === "INVALID") errors.push({ line, message: `Pierna inválida: "${cell(r, "leg")}" (usa izquierda/derecha).` });
    if (parentCode || (legRaw && legRaw !== "INVALID")) {
      if (!parentCode) errors.push({ line, message: "Trae pierna pero no dice bajo quién se coloca." });
      else if (!legRaw) errors.push({ line, message: "Trae colocación pero falta la pierna (izquierda/derecha)." });
      else if (legRaw !== "INVALID") {
        parentId = resolveRef(parentCode);
        if (!parentId) errors.push({ line, message: `La colocación "${parentCode}" no existe ni en el archivo ni en tu red.` });
        else if (parentCode === code) errors.push({ line, message: "Un distribuidor no puede colocarse bajo sí mismo." });
        else {
          leg = legRaw;
          const slot = `${parentId}:${leg}`;
          if (occupiedSlots.has(slot)) errors.push({ line, message: `La pierna ${leg === "LEFT" ? "izquierda" : "derecha"} de "${parentCode}" ya está ocupada en tu red.` });
          else if (fileSlots.has(slot)) {
            errors.push({ line, message: `La pierna ${leg === "LEFT" ? "izquierda" : "derecha"} de "${parentCode}" ya la usa la línea ${fileSlots.get(slot)}.` });
          } else fileSlots.set(slot, line);
        }
      }
    }

    // rango
    let rank = cell(r, "rank");
    if (!rank) rank = ctx.ranks[0] ?? "Distribuidor";
    else if (!rankSet.has(rank)) {
      errors.push({ line, message: `El rango "${rank}" no existe en tu plan (${ctx.ranks.join(", ")}).` });
    }

    // estado y fecha
    const status = parseStatus(cell(r, "status"));
    if (status === "INVALID") errors.push({ line, message: `Estado inválido: "${cell(r, "status")}" (usa activo/inactivo).` });
    const joined = parseDate(cell(r, "joined_at"));
    if (joined === "INVALID") errors.push({ line, message: `Fecha inválida: "${cell(r, "joined_at")}" (usa día/mes/año o año-mes-día).` });

    if (errors.length === startErrors) {
      const id = idByCode.get(code)!;
      if (sponsorId && idByCode.has(sponsorCode)) sponsorOf.set(id, sponsorId);
      if (parentId && idByCode.has(parentCode)) placementOf.set(id, parentId);
      rows.push({
        id,
        code,
        full_name: fullName,
        email: email || null,
        sponsor_id: sponsorId,
        placement_parent_id: parentId,
        placement_leg: leg,
        rank,
        status: status && status !== "INVALID" ? status : "ACTIVE",
        joined_at: joined && joined !== "INVALID" ? joined : null,
      });
    }
  }

  // Ciclos (A patrocina a B y B a A, etc.)
  const codeById = new Map<string, string>();
  for (const [c, id] of idByCode) codeById.set(id, c);
  for (const [label, graph] of [["patrocinio", sponsorOf], ["colocación", placementOf]] as const) {
    const members = findCycleMembers(graph);
    for (const id of members) {
      const code = codeById.get(id) ?? id;
      errors.push({ line: lineByCode.get(code) ?? 0, message: `"${code}" forma un ciclo en el ${label} (se patrocina/coloca a sí mismo indirectamente).` });
    }
  }

  // Avisos
  const emails = new Map<string, number>();
  for (const row of rows) {
    if (!row.email) continue;
    const key = row.email.toLowerCase();
    emails.set(key, (emails.get(key) ?? 0) + 1);
  }
  for (const [email, n] of emails) if (n > 1) warnings.push({ line: 0, message: `El correo ${email} aparece ${n} veces; solo podrás darle acceso al portal a uno.` });
  if (roots > 1 && ctx.existing.length === 0) warnings.push({ line: 0, message: `${roots} distribuidores quedan sin patrocinador (raíces de la red). ¿Es lo esperado?` });
  if (roots > 0 && ctx.existing.length > 0) warnings.push({ line: 0, message: `${roots} distribuidores nuevos quedan sin patrocinador, separados de la red actual.` });

  return { rows: errors.length ? [] : rows, errors, warnings };
}

export const IMPORT_TEMPLATE = [
  "codigo,nombre,correo,patrocinador,colocacion,pierna,rango,estado,fecha_ingreso",
  "00001,Ana Reyes,ana@correo.com,,,,Diamante,activo,15/03/2022",
  "00002,Luis Cano,luis@correo.com,00001,00001,izquierda,Esmeralda,activo,02/06/2022",
  "00003,María Torres,maria@correo.com,00001,00001,derecha,Plata,activo,10/01/2023",
].join("\n");
