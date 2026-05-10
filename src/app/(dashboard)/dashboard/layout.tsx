import { Sidebar } from "@/components/Sidebar";
import { SupabaseRealtimeRefresh } from "@/components/SupabaseRealtimeRefresh";
import { requireRole } from "@/lib/auth/roles";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");
  const userProfile = profile as any;

  return (
    <div className="min-h-screen bg-road text-ink dark:bg-[#101815] dark:text-stone-50">
      <div className="md:hidden">
        <Sidebar role="admin" name={userProfile?.full_name || "Utilisateur"} />
      </div>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        <div className="hidden md:block">
          <Sidebar role="admin" name={userProfile?.full_name || "Utilisateur"} />
        </div>
        <main className="min-w-0 px-4 py-5 md:px-8 md:py-8">
          <SupabaseRealtimeRefresh />
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
