import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { AppTopbar } from "@/components/app-shell/app-topbar";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="workspace-main min-h-screen py-6">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 md:grid-cols-[280px_1fr] md:px-6">
        <AppSidebar />
        <section>
          <AppTopbar />
          <div className="grid gap-4">{children}</div>
        </section>
      </div>
    </main>
  );
}

