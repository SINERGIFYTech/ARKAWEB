// Si NEXT_PUBLIC_SITE_URL trae una "/" al final (ej. "https://app.com/"),
// concatenar "/accept-invite" produce "https://app.com//accept-invite" — una
// URL con doble diagonal que el navegador/Supabase interpretan mal (la
// confunden con un protocolo relativo, tratando "accept-invite" como si fuera
// el host). Esta función siempre regresa la URL sin diagonal al final.
export function getSiteUrl(fallback = "http://localhost:3000"): string {
  const raw =
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL : undefined) ||
    fallback;
  return raw.replace(/\/+$/, "");
}
