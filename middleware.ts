import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// El middleware corre en CADA visita y le pregunta a Supabase si la sesión es
// válida. Si Supabase no responde (proyecto pausado, caída, URL mal puesta) y no
// hay un límite de tiempo, el sitio entero se cuelga hasta que Netlify mata la
// función ("edge function timed out"), incluso para llegar al login o cerrar
// sesión. Con el límite, falla rápido y manda al login con un aviso.
const TIMEOUT = Symbol("timeout");
const AUTH_TIMEOUT_MS = 4000;
const CHECK_TIMEOUT_MS = 3000;

async function limited<T>(work: PromiseLike<T>, ms: number): Promise<T | typeof TIMEOUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT), ms);
  });
  try {
    return await Promise.race([Promise.resolve(work), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/forgot-password");
  const isPortalLoginRoute = request.nextUrl.pathname.startsWith("/portal/login");
  const isPortalAcceptInviteRoute = request.nextUrl.pathname.startsWith("/portal/accept-invite");
  const isPortalForgotPasswordRoute = request.nextUrl.pathname.startsWith("/portal/forgot-password");
  const isPortalRoute =
    request.nextUrl.pathname.startsWith("/portal") &&
    !isPortalLoginRoute &&
    !isPortalAcceptInviteRoute &&
    !isPortalForgotPasswordRoute;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

  // Sin credenciales de Supabase configuradas, no tocamos auth — modo demo.
  if (!supabaseConfigured) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const redirectTo = (pathname: string, authUnavailable = false) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = authUnavailable ? "?e=timeout" : "";
    return NextResponse.redirect(url);
  };

  const userResult = await limited(supabase.auth.getUser(), AUTH_TIMEOUT_MS);
  // Si no se pudo verificar a tiempo, se trata como "sin sesión" (falla cerrado:
  // nunca se deja pasar a una ruta protegida sin haber verificado quién es).
  const authUnavailable = userResult === TIMEOUT;
  const user = authUnavailable ? null : userResult.data.user;

  if (isDashboardRoute && !user) {
    return redirectTo("/login", authUnavailable);
  }

  // Si entra a /dashboard con sesión pero no es staff de ningún tenant (ej. es
  // un distribuidor que cayó aquí por un link mal configurado), lo manda a su
  // portal en vez de dejarlo viendo un dashboard vacío/demo sin saber por qué.
  if (isDashboardRoute && user) {
    const membershipResult = await limited(
      supabase.from("tenant_users").select("tenant_id").eq("user_id", user.id).eq("status", "ACTIVE").limit(1).maybeSingle(),
      CHECK_TIMEOUT_MS
    );
    const membership = membershipResult === TIMEOUT ? undefined : membershipResult.data;

    if (membershipResult !== TIMEOUT && !membership && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Un distribuidor no es "staff" del tenant, así que RLS no lo dejaría ver
      // su propia fila con el cliente normal — aquí sí hace falta el admin client.
      const admin = createSupabaseClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const distributorResult = await limited(
        admin.from("distributors").select("id").eq("user_id", user.id).maybeSingle(),
        CHECK_TIMEOUT_MS
      );
      if (distributorResult !== TIMEOUT && distributorResult.data) {
        return redirectTo("/portal");
      }
    }
  }

  if (isPortalRoute && !user) {
    return redirectTo("/portal/login", authUnavailable);
  }

  // accept-invite NUNCA redirige aunque ya haya sesión: esa sesión temporal del
  // link de invitación es justo lo que se necesita para poder fijar la contraseña.
  if (isPortalLoginRoute && user) {
    return redirectTo("/portal");
  }

  // Si la cuenta tiene 2FA activo y esta sesión aún no lo cumplió, manda al reto
  // antes de dejar pasar a cualquier ruta protegida (dashboard o admin).
  if ((isDashboardRoute || isAdminRoute) && user) {
    const aalResult = await limited(supabase.auth.mfa.getAuthenticatorAssuranceLevel(), CHECK_TIMEOUT_MS);
    if (aalResult === TIMEOUT) return redirectTo("/login", true);
    const aal = aalResult.data;
    if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      return redirectTo("/mfa-challenge");
    }
  }

  if (isAdminRoute) {
    if (!user) {
      return redirectTo("/login", authUnavailable);
    }
    const profileResult = await limited(
      supabase.from("users").select("is_platform_admin").eq("id", user.id).maybeSingle(),
      CHECK_TIMEOUT_MS
    );
    if (profileResult === TIMEOUT) return redirectTo("/login", true);

    if (!profileResult.data?.is_platform_admin) {
      return redirectTo("/dashboard");
    }
  }

  if (isAuthRoute && user) {
    return redirectTo("/dashboard");
  }

  // TODO Fase 2: resolver tenant por subdominio/dominio custom aquí
  // y adjuntarlo como header para que layouts/páginas lo lean (x-tenant-id).

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
