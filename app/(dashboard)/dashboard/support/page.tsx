import { getTickets } from "@/modules/support/repository";
import { SupportClient } from "@/modules/support/support-client";

export default async function SupportPage() {
  const { tickets, isDemo } = await getTickets();
  return <SupportClient tickets={tickets} isDemo={isDemo} />;
}
