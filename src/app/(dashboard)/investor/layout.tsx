import { Sidebar } from "@/components/Sidebar";
import { SupabaseRealtimeRefresh } from "@/components/SupabaseRealtimeRefresh";
import { getCurrentProfile } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let investorName = "Investisseur";

  try {
    const profile = await getCurrentProfile();
    investorName = profile?.full_name?.trim() || "Investisseur";
  } catch (error) {
    console.error("[InvestorLayout] Unable to load investor profile", error);
  }

  return (
    <div
      className="min-h-screen text-stone-100"
      style={{ backgroundColor: "#0b1210" }}
    >
      {/* Mobile sidebar */}
      <div className="md:hidden">
        <Sidebar
          role="investor"
          name={investorName}
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
            name={investorName}
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
