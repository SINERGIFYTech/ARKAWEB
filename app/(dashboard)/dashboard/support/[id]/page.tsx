import { notFound } from "next/navigation";
import { getTicket, getTicketMessages } from "@/modules/support/repository";
import { TicketDetailClient } from "@/modules/support/ticket-detail-client";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();

  const messages = await getTicketMessages(id);
  const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  return <TicketDetailClient ticket={ticket} messages={messages} isDemo={isDemo} />;
}
