import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");
  const isPortalLoginRoute = request.nextUrl.pathname.startsWith("/portal/login");
  const isPortalAcceptInviteRoute = request.nextUrl.pathname.startsWith("/portal/accept-invite");
  const isPortalRoute =
    request.nextUrl.pathname.startsWith("/portal") && !isPortalLoginRoute && !isPortalAcceptInviteRoute;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isPortalRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal/login";
    return NextResponse.redirect(url);
  }

  // accept-invite NUNCA redirige aunque ya haya sesión: esa sesión temporal del
  // link de invitación es justo lo que se necesita para poder fijar la contraseña.
  if (isPortalLoginRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  // Si la cuenta tiene 2FA activo y esta sesión aún no lo cumplió, manda al reto
  // antes de dejar pasar a cualquier ruta protegida (dashboard o admin).
  if ((isDashboardRoute || isAdminRoute) && user) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      const url = request.nextUrl.clone();
      url.pathname = "/mfa-challenge";
      return NextResponse.redirect(url);
    }
  }

  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from("users")
      .select("is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_platform_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // TODO Fase 2: resolver tenant por subdominio/dominio custom aquí
  // y adjuntarlo como header para que layouts/páginas lo lean (x-tenant-id).

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
