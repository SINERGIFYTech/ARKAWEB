import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CurrentDistributor {
  id: string;
  tenantId: string;
  code: string;
  fullName: string;
  rank: string;
}

// Un distribuidor NO es un tenant_user (no es staff) — por eso esto no pasa por
// RLS normal: usa el cliente admin (service role), acotado a la fila cuyo
// user_id sea exactamente el de la sesión actual. Mismo patrón que /admin.
export async function getCurrentDistributor(): Promise<CurrentDistributor | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("distributors")
    .select("id, tenant_id, code, full_name, rank")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return { id: data.id, tenantId: data.tenant_id, code: data.code, fullName: data.full_name, rank: data.rank };
}
