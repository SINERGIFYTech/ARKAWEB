// Supabase/PostgREST devuelve como máximo 1,000 filas por consulta y lo hace en
// silencio: con una red de más de mil distribuidores, el árbol y las comisiones
// se calcularían sobre datos incompletos sin ningún error. Este helper pide por
// páginas hasta traer todo. Requiere un .order() estable en la consulta.
export async function fetchAll<T = any>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
  }
  return out;
}

// Para inserts/upserts grandes: parte el arreglo en bloques.
export function chunk<T>(items: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
