import { getCurrentDistributor } from "@/lib/distributor-auth";
import { getPortalTickets } from "@/modules/portal/repository";
import { createClient } from "@/lib/supabase/server";
import { PortalHelpClient } from "@/modules/portal/help-client";

export default async function PortalHelpPage() {
  const distributor = await getCurrentDistributor();
  if (!distributor) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tickets = user ? await getPortalTickets(distributor, user.id) : [];

  return <PortalHelpClient tickets={tickets} />;
}
