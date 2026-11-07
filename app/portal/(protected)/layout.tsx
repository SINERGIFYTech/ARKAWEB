import { redirect } from "next/navigation";
import { getCurrentDistributor } from "@/lib/distributor-auth";
import { PortalSidebar } from "@/components/portal-sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const distributor = await getCurrentDistributor();
  if (!distributor) redirect("/portal/login");

  return (
    <div className="flex h-screen">
      <PortalSidebar fullName={distributor.fullName} code={distributor.code} />
      <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
    </div>
  );
}
