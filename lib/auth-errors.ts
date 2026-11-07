// Traduce los errores de autenticación a mensajes que una persona pueda entender.
// "Failed to fetch" significa que el NAVEGADOR no pudo comunicarse con Supabase
// (proyecto pausado, URL mal escrita, caída de red), no que la contraseña esté mal.
export function friendlyAuthError(error: { message?: string; name?: string } | unknown, audience: "admin" | "portal" = "admin"): string {
  const e = (error ?? {}) as { message?: string; name?: string };
  const m = (e.message ?? "").toLowerCase();

  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed") || e.name === "AuthRetryableFetchError") {
    return audience === "admin"
      ? "No se pudo conectar con el servidor de autenticación. Revisa que el proyecto de Supabase esté activo (los gratuitos se pausan por inactividad) y que NEXT_PUBLIC_SUPABASE_URL sea correcta."
      : "No se pudo conectar con el servidor. Intenta de nuevo en unos minutos; si sigue igual, avisa a tu empresa.";
  }
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  return e.message || "Ocurrió un error. Intenta de nuevo.";
}

// Aviso cuando el middleware no pudo verificar la sesión a tiempo (?e=timeout).
export const SESSION_TIMEOUT_NOTICE =
  "No pudimos verificar tu sesión porque el servidor de autenticación no respondió. Intenta de nuevo en unos minutos.";
