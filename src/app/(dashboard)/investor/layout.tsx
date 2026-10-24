import { Sidebar } from "@/components/Sidebar";
import { SupabaseRealtimeRefresh } from "@/components/SupabaseRealtimeRefresh";
import Link from "next/link";
import { requireRole } from "@/lib/auth/roles";
import { getOwnerBilling } from "@/lib/billing/subscription";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("investor");
  const investorName = profile.full_name?.trim() || "Investisseur";
  const billing = await getOwnerBilling(await createClient(), profile.id);
  // Bandeau seulement quand il y a quelque chose à payer : fin d'essai proche ou expiré.
  const billingNotice =
    billing && billing.quote.totalUsd > 0
      ? billing.state.status === "expired"
        ? { tone: "border-red-500/30 bg-red-500/10 text-red-200", text: "Votre abonnement a expiré. Renouvelez-le pour continuer à ajouter des véhicules." }
        : billing.state.daysLeft <= 5
          ? {
              tone: "border-amber-500/30 bg-amber-500/10 text-amber-100",
              text: `${billing.state.status === "trial" ? "Votre essai gratuit" : "Votre abonnement"} se termine dans ${billing.state.daysLeft} jour(s).`
            }
          : null
      : null;

  return (
    <div
      className="min-h-screen text-stone-100"
      style={{ backgroundColor: "#0b1210" }}
    >
      {/* Mobile sidebar */}
      <div className="md:hidden">
        <Sidebar collapsible
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
          {billingNotice ? (
            <div className={`mx-auto mb-5 flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm ${billingNotice.tone}`}>
              <span>{billingNotice.text}</span>
              <Link href={ROUTES.INVESTOR_BILLING} className="font-semibold underline">
                Voir l&apos;abonnement
              </Link>
            </div>
          ) : null}
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
