import type { DriverActiveContract } from "@/lib/dashboard/data";
import { formatCDF } from "@/lib/utils/currency";

type Props = {
  contract: DriverActiveContract;
};

/**
 * Contrat actif du chauffeur (espace chauffeur, univers « plaque »).
 * Pour un contrat location-vente, montre où en est le rachat du véhicule.
 */
export function ContractInfoBanner({ contract }: Props) {
  const isLocationVente = contract.contract_type === "location_vente";

  const total = contract.possession_total_cdf ?? 0;
  const paid = contract.possession_paid_cdf ?? 0;
  const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const remaining = Math.max(0, total - paid);

  if (isLocationVente) {
    return (
      <section aria-labelledby="contract-title" className="rounded-xl border-2 border-plate-ink bg-plate-white px-4 py-4">
        <h2 id="contract-title" className="font-plate text-[24px] font-bold leading-tight">
          Location-vente
        </h2>
        <p className="mt-1 text-[16px]">
          Chaque versement validé vous rapproche du moment où le véhicule sera à vous.
        </p>

        {total > 0 ? (
          <div className="mt-4">
            <div className="flex items-end justify-between gap-3">
              <p className="text-[15px] font-semibold">
                Déjà payé
                <span className="block font-plate text-[22px] font-bold">{formatCDF(paid)}</span>
              </p>
              <p className="text-right text-[15px] font-semibold">
                Prix du véhicule
                <span className="block font-plate text-[22px] font-bold">{formatCDF(total)}</span>
              </p>
            </div>
            <div
              className="mt-2 h-3 w-full rounded-sm bg-plate-rule/60"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
              aria-label="Rachat du véhicule"
            >
              <div className="h-3 rounded-sm bg-plate-ink" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-2 flex items-baseline justify-between gap-3 text-[15px] font-semibold">
              <span>{progressPct} % payé</span>
              {remaining > 0 ? (
                <span>Reste {formatCDF(remaining)}</span>
              ) : (
                <span className="text-plate-ok">Le véhicule est à vous.</span>
              )}
            </p>
          </div>
        ) : null}
      </section>
    );
  }

  // Contrat employé standard
  return (
    <p className="border-y-2 border-plate-rule py-3 text-[16px]">
      <b>Contrat employé</b> : vous conduisez pour votre investisseur.
    </p>
  );
}
