import type { Viewport } from "next";
import { plateFont, streetFont } from "@/app/plate-fonts";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { InvestorRail, InvestorTopBar } from "@/components/investor/InvestorNav";
import { SupabaseRealtimeRefresh } from "@/components/SupabaseRealtimeRefresh";
import { requireRole } from "@/lib/auth/roles";
import { getOwnerBilling } from "@/lib/billing/subscription";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#f7f7f2"
};

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
        ? { expired: true, text: "Votre abonnement a expiré. Renouvelez-le pour continuer à ajouter des véhicules." }
        : billing.state.daysLeft <= 5
          ? {
              expired: false,
              text: `${billing.state.status === "trial" ? "Votre essai gratuit" : "Votre abonnement"} se termine dans ${billing.state.daysLeft} jour(s).`
            }
          : null
      : null;

  return (
    <div className={`plate-world ${streetFont.variable} ${plateFont.variable} min-h-screen`}>
      <InvestorTopBar name={investorName} />
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[230px_1fr]">
        <InvestorRail name={investorName} />
        <main className="min-w-0 px-4 pb-12 pt-5 md:px-8 md:pt-8">
          <SupabaseRealtimeRefresh />
          {billingNotice ? (
            <p
              role="status"
              className={cn(
                "mx-auto mb-5 flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border-2 bg-plate-white px-4 py-3 text-[15px] font-semibold",
                billingNotice.expired ? "border-plate-bad text-plate-bad" : "border-plate-ink"
              )}
            >
              <span className="flex items-start gap-2">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
                {billingNotice.text}
              </span>
              <Link href={ROUTES.INVESTOR_BILLING} className="underline underline-offset-4">
                Voir l&apos;abonnement
              </Link>
            </p>
          ) : null}
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
