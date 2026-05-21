import { Sidebar } from "@/components/Sidebar";
import { SupabaseRealtimeRefresh } from "@/components/SupabaseRealtimeRefresh";
import { requireRole } from "@/lib/auth/roles";

export default async function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard: redirects to /login if unauthenticated, or to the correct portal if wrong role
  const profile = await requireRole("investor");
  const userProfile = profile as any;

  return (
    <div
      className="min-h-screen text-stone-100"
      style={{ backgroundColor: "#0b1210" }}
    >
      {/* Mobile sidebar */}
      <div className="md:hidden">
        <Sidebar
          role="investor"
          name={userProfile?.full_name ?? "Investisseur"}
        />
      </div>

      {/* Desktop two-column grid */}
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[250px_1fr]">
        {/* Sidebar column */}
        <div
          className="hidden md:flex md:flex-col"
          style={{ backgroundColor: "#0d1612" }}
        >
          <Sidebar
            role="investor"
            name={userProfile?.full_name ?? "Investisseur"}
          />
        </div>

        {/* Main content column */}
        <main className="min-w-0 overflow-auto px-4 py-6 md:px-8 md:py-8">
          <SupabaseRealtimeRefresh />
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
