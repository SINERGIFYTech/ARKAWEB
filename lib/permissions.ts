import { createClient } from "@/lib/supabase/server";

// Acciones delicadas (cambiar el CV de un producto, importar la red completa)
// solo para Owner/Admin. Todavía no existe un sistema de permisos granulares:
// cualquier miembro del equipo puede hacer el resto de las operaciones.
export async function assertOwnerOrAdmin(tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data } = await supabase
    .from("tenant_users")
    .select("roles(name)")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  const roleName = (data as any)?.roles?.name;
  if (roleName !== "Owner" && roleName !== "Admin") {
    throw new Error("Solo Owner o Admin pueden hacer esto.");
  }
}
