// Lunes a domingo de la semana que contiene `date` (o hoy si se omite).
export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const day = date.getDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function weekLabel(start: Date, end: Date): string {
  return `Semana del ${formatDate(start)} al ${formatDate(end)}`;
}
