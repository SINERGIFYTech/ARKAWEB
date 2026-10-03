import { getInvoices } from "@/modules/finance/repository";
import { FinanceClient } from "@/modules/finance/finance-client";

export default async function FinancePage() {
  const { invoices, isDemo } = await getInvoices();
  return <FinanceClient invoices={invoices} isDemo={isDemo} />;
}
