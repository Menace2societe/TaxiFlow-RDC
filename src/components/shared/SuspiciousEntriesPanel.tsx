import { Gauge, ShieldAlert } from "lucide-react";
import type { DashboardEntry, DashboardVehicle } from "@/lib/dashboard/data";
import { SUSPICIOUS_DISTANCE_KM, SUSPICIOUS_MAX_DECLARED_CDF } from "@/lib/entries/metrics";
import { formatCDF } from "@/lib/utils/currency";

type Props = {
  entries: DashboardEntry[];
  vehicles: Pick<DashboardVehicle, "id" | "label" | "plate_number">[];
  /** Nombre maximum de lignes affichées. */
  limit?: number;
};

/**
 * Recettes signalées par la règle anti-fraude (daily_entries.is_suspicious) :
 * beaucoup de kilomètres pour une recette très faible.
 */
export function SuspiciousEntriesPanel({ entries, vehicles, limit = 8 }: Props) {
  const suspicious = entries.filter((entry) => entry.is_suspicious);
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  return (
    <section
      aria-labelledby="suspicious-entries-title"
      className={[
        "rounded-lg border p-5",
        suspicious.length > 0 ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-white/10 bg-white/[0.04]"
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="suspicious-entries-title" className="flex items-center gap-2 text-lg font-semibold text-white">
            <ShieldAlert size={18} className={suspicious.length > 0 ? "text-amber-300" : "text-emerald-300"} aria-hidden />
            Alertes kilométriques
          </h2>
          <p className="mt-1 text-sm text-stone-400">
            Plus de {SUSPICIOUS_DISTANCE_KM} km parcourus pour {formatCDF(SUSPICIOUS_MAX_DECLARED_CDF)} ou moins déclarés.
          </p>
        </div>
        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            suspicious.length > 0 ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/15 text-emerald-300"
          ].join(" ")}
        >
          {suspicious.length}
        </span>
      </div>

      {suspicious.length === 0 ? (
        <p className="mt-4 text-sm text-stone-400">Aucune recette suspecte sur la période affichée.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10">
          {suspicious.slice(0, limit).map((entry) => {
            const vehicle = vehicleById.get(entry.vehicle_id);
            return (
              <li key={entry.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">
                    {vehicle ? `${vehicle.label} · ${vehicle.plate_number}` : "Véhicule"}
                  </p>
                  <p className="text-xs text-stone-400">
                    {entry.entry_date} · km {entry.start_km.toLocaleString("fr-CD")} → {entry.end_km.toLocaleString("fr-CD")}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-amber-200">
                    <Gauge size={14} aria-hidden />
                    {entry.distance_covered.toLocaleString("fr-CD")} km
                  </span>
                  <span className="font-semibold text-white">{formatCDF(entry.revenue_cdf)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {suspicious.length > limit ? (
        <p className="mt-2 text-xs text-stone-400">
          + {suspicious.length - limit} autre(s) : exportez les recettes en CSV pour la liste complète.
        </p>
      ) : null}
    </section>
  );
}
