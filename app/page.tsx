import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { getCurrentDistributor } from "@/lib/distributor-auth";

export default async function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect("/dashboard"); // modo demo
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Prioriza staff del equipo; si no lo es pero sí es un distribuidor
    // (ej. llegó por un link de invitación al portal), lo manda a su portal
    // en vez de dejarlo varado en el dashboard de administración.
    const tenantId = await getCurrentTenantId();
    if (tenantId) redirect("/dashboard");

    const distributor = await getCurrentDistributor();
    if (distributor) redirect("/portal");
  }

  redirect("/dashboard");
}
