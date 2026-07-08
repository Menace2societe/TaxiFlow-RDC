import { TrendingUp, FileText, Star } from "lucide-react";
import type { DriverActiveContract } from "@/lib/dashboard/data";
import { formatCDF } from "@/lib/utils/currency";

type Props = {
  contract: DriverActiveContract;
};

/**
 * Bannière d'information sur le contrat actif du chauffeur.
 * Pour un contrat location-vente, affiche une mention encourageante
 * avec la progression du rachat du véhicule.
 */
export function ContractInfoBanner({ contract }: Props) {
  const isLocationVente = contract.contract_type === "location_vente";

  const total = contract.possession_total_cdf ?? 0;
  const paid = contract.possession_paid_cdf ?? 0;
  const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const remaining = Math.max(0, total - paid);

  if (isLocationVente) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-neutral-900 to-neutral-900 p-5 shadow-lg">
        {/* Glow décoratif */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(245,158,11,0.08)_0%,_transparent_60%)]" />

        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-500/15 p-2.5">
              <Star className="text-amber-400" size={20} aria-hidden fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                Contrat de Location-Vente
              </p>
              <p className="mt-1 text-sm font-medium text-amber-100">
                Vos versements participent à l&apos;acquisition finale de votre véhicule
              </p>
              <p className="mt-1 text-xs text-amber-300/70">
                Chaque paiement vous rapproche de la propriété totale de votre taxi.
              </p>
            </div>
          </div>

          {total > 0 && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-xs text-amber-300/60">Déjà versé</p>
                  <p className="text-lg font-bold text-amber-200">{formatCDF(paid)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-300/60">Objectif total</p>
                  <p className="text-lg font-bold text-white">{formatCDF(total)}</p>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">{progressPct}% accompli</span>
                </div>
                {remaining > 0 && (
                  <span className="text-xs text-neutral-500">
                    Reste : {formatCDF(remaining)}
                  </span>
                )}
                {remaining === 0 && (
                  <span className="text-xs font-semibold text-emerald-400">
                    ✓ Véhicule entièrement acquis !
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Contrat employé standard
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
      <div className="rounded-lg bg-neutral-800 p-2">
        <FileText size={16} className="text-neutral-400" aria-hidden />
      </div>
      <div>
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Contrat Employé</p>
        <p className="text-sm text-neutral-300">Vous êtes employé de votre investisseur.</p>
      </div>
    </div>
  );
}
