import { createClient } from "@/lib/supabase/server";

// Devuelve el tenant_id del usuario logueado (primera membresía activa).
// Si Supabase no está configurado o no hay sesión, devuelve null (modo demo).
export async function getCurrentTenantId(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  return data?.tenant_id ?? null;
}
