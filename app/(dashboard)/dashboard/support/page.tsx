const tickets = [
  { id: "#341", subject: "No puedo activar el módulo de Inventario", priority: "Alta", status: "Abierto" },
  { id: "#340", subject: "Duda sobre facturación del plan Pro", priority: "Media", status: "En proceso" },
  { id: "#339", subject: "Error al exportar reporte a Excel", priority: "Alta", status: "Abierto" },
  { id: "#338", subject: "Solicitud de nuevo rol personalizado", priority: "Baja", status: "Cerrado" },
];

const priorityColor: Record<string, string> = {
  Alta: "bg-red-500/10 text-red-600 dark:text-red-400",
  Media: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Baja: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export default function SupportPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Soporte</h1>
        <p className="text-sm text-muted-foreground">{tickets.length} tickets abiertos</p>
      </div>

      <div className="space-y-2">
        {tickets.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="text-sm font-medium">
                <span className="text-muted-foreground">{t.id}</span> — {t.subject}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.status}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[t.priority]}`}>
              {t.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
