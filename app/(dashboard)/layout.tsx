import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { CommandPalette } from "@/components/command-palette";
import { getEnabledModuleKeys } from "@/lib/modules";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabledKeys = await getEnabledModuleKeys();

  return (
    <div className="flex h-screen">
      <Sidebar enabledKeys={enabledKeys} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
      <CommandPalette enabledKeys={enabledKeys} />
    </div>
  );
}
