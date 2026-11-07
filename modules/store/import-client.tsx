"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { IMPORT_TEMPLATE } from "@/modules/rankflow/import-csv";

interface Issue { line: number; message: string }
interface Result { valid: boolean; count: number; existingCount: number; errors: Issue[]; totalErrors: number; warnings: Issue[] }

export function ImportClient({ isDemo }: { isDemo: boolean }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [done, setDone] = useState<number | null>(null);

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF" + IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plantilla-importacion-red.csv";
    a.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setCsv(await f.text());
    setResult(null);
    setDone(null);
  }

  async function validate() {
    setBusy(true);
    setError(null);
    setResult(null);
    setConfirmText("");
    const res = await fetch("/api/rankflow/import/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "No se pudo validar");
    setResult(body);
  }

  async function commit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/rankflow/import/commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "No se pudo importar");
    setDone(body.imported);
    setResult(null);
    setCsv("");
    setFileName("");
    router.refresh();
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar red</h1>
        <p className="text-sm text-muted-foreground">
          Carga a tu red existente desde un archivo CSV. Se valida <strong>todo</strong> antes de guardar y la importación es atómica: o entra completa o no entra nada. {isDemo && "· modo demo"}
        </p>
      </div>

      <div className="card-elevated space-y-3 p-5 text-sm">
        <p className="font-semibold">Cómo preparar el archivo</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Columnas: <code>codigo</code> y <code>nombre</code> son obligatorias; opcionales: <code>correo, patrocinador, colocacion, pierna, rango, estado, fecha_ingreso</code>.</li>
          <li><code>patrocinador</code> y <code>colocacion</code> llevan el <em>código</em> de la otra persona (puede estar en el mismo archivo o ya en tu red). El orden de las filas no importa.</li>
          <li><code>pierna</code>: izquierda/derecha (obligatoria si hay <code>colocacion</code>). <code>fecha_ingreso</code>: día/mes/año — importante porque el inicio rápido depende de ella.</li>
          <li>En Excel: Guardar como <strong>CSV UTF-8</strong>. Máximo 5,000 filas por archivo; para redes más grandes, importa por partes poniendo primero a los patrocinadores.</li>
          <li><strong>No se puede deshacer.</strong> Te recomiendo probar primero en una organización de prueba.</li>
        </ul>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"><Download size={13} /> Descargar plantilla</button>
      </div>

      {done !== null && <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={16} /> Se importaron {done.toLocaleString("es-MX")} distribuidores. Revisa la Genealogía.</p>}

      <div className="card-elevated space-y-3 p-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Upload size={16} /> {fileName || "Elegir archivo CSV"}
          <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="hidden" disabled={isDemo} />
        </label>
        <button onClick={validate} disabled={!csv || busy || isDemo} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">{busy ? "Revisando…" : "Validar archivo"}</button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {result && (
        <div className="card-elevated space-y-4 p-5">
          {result.valid ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600"><CheckCircle2 size={16} /> Archivo válido: {result.count.toLocaleString("es-MX")} distribuidores listos para importar{result.existingCount > 0 ? ` (tu red ya tiene ${result.existingCount.toLocaleString("es-MX")})` : ""}.</p>
          ) : (
            <p className="flex items-center gap-2 text-sm font-semibold text-red-600"><XCircle size={16} /> {result.totalErrors} error(es): corrígelos en el archivo y vuelve a validar. No se importó nada.</p>
          )}

          {result.errors.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i} className="border-b border-border last:border-0"><td className="w-16 px-3 py-1.5 text-muted-foreground">{e.line ? `Línea ${e.line}` : "—"}</td><td className="px-3 py-1.5">{e.message}</td></tr>
                  ))}
                </tbody>
              </table>
              {result.totalErrors > result.errors.length && <p className="px-3 py-2 text-xs text-muted-foreground">…y {result.totalErrors - result.errors.length} más.</p>}
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="space-y-1">
              {result.warnings.map((w, i) => <p key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w.message}</p>)}
            </div>
          )}

          {result.valid && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Escribe IMPORTAR para confirmar" className="w-64 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              <button onClick={commit} disabled={confirmText !== "IMPORTAR" || busy} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">{busy ? "Importando…" : `Importar ${result.count.toLocaleString("es-MX")}`}</button>
              <p className="w-full text-[11px] text-muted-foreground">La importación cuenta como registros de distribuidor en tu consumo mensual y no dispara automatizaciones.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
