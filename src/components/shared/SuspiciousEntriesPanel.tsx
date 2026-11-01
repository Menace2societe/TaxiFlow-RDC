import { Gauge, ShieldAlert } from "lucide-react";
import { PlateChip, StateMark } from "@/components/driver/plate";
import type { DashboardEntry, DashboardVehicle } from "@/lib/dashboard/data";
import { SUSPICIOUS_DISTANCE_KM, SUSPICIOUS_MAX_DECLARED_CDF } from "@/lib/entries/metrics";
import { cn } from "@/lib/utils/cn";
import { formatCDF } from "@/lib/utils/currency";

type Props = {
  entries: DashboardEntry[];
  vehicles: Pick<DashboardVehicle, "id" | "label" | "plate_number">[];
  /** Nombre maximum de lignes affichées. */
  limit?: number;
};

/** « 2026-10-29 » → « jeu. 29 oct. » */
function entryDay(isoDate: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${isoDate.slice(0, 10)}T12:00:00Z`)
  );
}

/**
 * Recettes signalées par la règle anti-fraude (daily_entries.is_suspicious) :
 * beaucoup de kilomètres pour une recette très faible.
 *
 * Deux habillages : l'univers « plaque » (clair) en classes de base, l'ancien look sombre
 * de l'espace admin sous `dark:` (qui ne s'applique jamais dans .plate-world).
 */
export function SuspiciousEntriesPanel({ entries, vehicles, limit = 8 }: Props) {
  const suspicious = entries.filter((entry) => entry.is_suspicious);
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const flagged = suspicious.length > 0;

  return (
    <section
      aria-labelledby="suspicious-entries-title"
      className={cn(
        "dark:rounded-lg dark:border dark:p-5",
        flagged ? "dark:border-amber-500/40 dark:bg-amber-500/[0.06]" : "dark:border-white/10 dark:bg-white/[0.04]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="suspicious-entries-title"
            className="flex items-center gap-2 font-plate text-[24px] font-bold text-plate-ink dark:font-sans dark:text-lg dark:font-semibold dark:text-white"
          >
            <span className="inline-flex dark:hidden">
              <StateMark state={flagged ? "bad" : "none"} />
            </span>
            <ShieldAlert
              size={18}
              className={cn("hidden dark:inline", flagged ? "dark:text-amber-300" : "dark:text-emerald-300")}
              aria-hidden
            />
            Alertes kilométriques
          </h2>
          <p className="mt-1 text-[15px] text-plate-ink dark:text-sm dark:text-stone-400">
            Plus de {SUSPICIOUS_DISTANCE_KM} km parcourus pour {formatCDF(SUSPICIOUS_MAX_DECLARED_CDF)} ou moins déclarés.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 font-plate text-[24px] font-bold leading-none text-plate-ink",
            "dark:rounded-full dark:px-2.5 dark:py-1 dark:font-sans dark:text-xs dark:font-semibold",
            flagged ? "text-plate-bad dark:bg-amber-500/20 dark:text-amber-200" : "dark:bg-emerald-500/15 dark:text-emerald-300"
          )}
        >
          <span className="sr-only">Nombre de recettes suspectes : </span>
          {suspicious.length}
        </span>
      </div>

      {!flagged ? (
        <p className="mt-2 border-y-2 border-plate-rule py-5 text-[16px] text-plate-ink dark:mt-4 dark:border-0 dark:py-0 dark:text-sm dark:text-stone-400">
          Aucune recette suspecte sur la période affichée.
        </p>
      ) : (
        <ul className="mt-2 border-b-2 border-plate-rule dark:mt-4 dark:divide-y dark:divide-white/10 dark:border-0">
          {suspicious.slice(0, limit).map((entry) => {
            const vehicle = vehicleById.get(entry.vehicle_id);
            return (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-3 dark:flex-col dark:items-start dark:gap-1 dark:border-t-0 sm:dark:flex-row sm:dark:items-center"
              >
                <div className="min-w-0">
                  {vehicle ? (
                    <span className="dark:hidden">
                      <PlateChip plateNumber={vehicle.plate_number} />
                    </span>
                  ) : null}
                  <p className="mt-1 truncate text-[15px] text-plate-ink dark:mt-0 dark:font-medium dark:text-white">
                    <span className="dark:hidden">{vehicle ? vehicle.label : "Véhicule inconnu"}</span>
                    <span className="hidden dark:inline">{vehicle ? `${vehicle.label} · ${vehicle.plate_number}` : "Véhicule"}</span>
                  </p>
                  <p className="text-[15px] text-plate-soft dark:text-xs dark:text-stone-400">
                    <span className="dark:hidden">{entryDay(entry.entry_date)}</span>
                    <span className="hidden dark:inline">{entry.entry_date}</span>
                    {" · "}compteur {entry.start_km.toLocaleString("fr-CD")} → {entry.end_km.toLocaleString("fr-CD")} km
                  </p>
                </div>
                <div className="shrink-0 text-right dark:flex dark:items-center dark:gap-3 dark:text-left dark:text-sm">
                  <span className="block font-plate text-[21px] font-bold text-plate-ink dark:order-2 dark:font-sans dark:text-sm dark:font-semibold dark:text-white">
                    {formatCDF(entry.revenue_cdf)}
                  </span>
                  <span className="flex items-center justify-end gap-1.5 text-[14px] font-semibold text-plate-bad dark:order-1 dark:gap-1 dark:font-normal dark:text-amber-200">
                    <Gauge size={14} className="hidden dark:inline" aria-hidden />
                    {entry.distance_covered.toLocaleString("fr-CD")} km
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {suspicious.length > limit ? (
        <p className="mt-2 text-[15px] text-plate-ink dark:text-xs dark:text-stone-400">
          + {suspicious.length - limit} autre(s) : exportez les recettes en CSV pour la liste complète.
        </p>
      ) : null}
    </section>
  );
}
