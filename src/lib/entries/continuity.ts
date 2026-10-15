/**
 * Détection des courses « hors application » par la continuité du compteur.
 *
 * Le compteur kilométrique tourne même quand le chauffeur se déconnecte. Si le
 * km de départ d'un jour dépasse le km d'arrivée de la recette précédente, la
 * différence a été roulée sans être déclarée. Un compteur qui recule signale
 * une saisie fausse ou un compteur trafiqué.
 */

/** Écart toléré (déplacement domicile → parking, arrondis de lecture). */
export const UNDECLARED_KM_TOLERANCE = 5;

export type ContinuityEntry = {
  id: string;
  vehicle_id: string;
  entry_date: string;
  start_km: number;
  end_km: number;
};

export type ContinuityAnomaly = {
  kind: "undeclared_km" | "odometer_rollback";
  vehicle_id: string;
  entry_id: string;
  entry_date: string;
  previous_entry_date: string;
  previous_end_km: number;
  start_km: number;
  /** Km roulés sans recette (positif) ou recul du compteur (négatif). */
  gap_km: number;
};

export function findContinuityAnomalies(
  entries: ContinuityEntry[],
  tolerance = UNDECLARED_KM_TOLERANCE
): ContinuityAnomaly[] {
  const byVehicle = new Map<string, ContinuityEntry[]>();
  for (const entry of entries) {
    // Les anciennes lignes sans kilométrage ne permettent aucune comparaison.
    if (entry.end_km <= 0) continue;
    byVehicle.set(entry.vehicle_id, [...(byVehicle.get(entry.vehicle_id) ?? []), entry]);
  }

  const anomalies: ContinuityAnomaly[] = [];
  for (const vehicleEntries of byVehicle.values()) {
    const sorted = [...vehicleEntries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    for (let index = 1; index < sorted.length; index++) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const gap = Math.round((current.start_km - previous.end_km) * 10) / 10;

      if (gap > tolerance || gap < 0) {
        anomalies.push({
          kind: gap > 0 ? "undeclared_km" : "odometer_rollback",
          vehicle_id: current.vehicle_id,
          entry_id: current.id,
          entry_date: current.entry_date,
          previous_entry_date: previous.entry_date,
          previous_end_km: previous.end_km,
          start_km: current.start_km,
          gap_km: gap
        });
      }
    }
  }

  return anomalies.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
}

/**
 * Jours sans recette pour un véhicule en service : un véhicule qui roule sans
 * versement déclaré. `dates` est la liste des jours à contrôler (YYYY-MM-DD).
 */
export function findMissingDays(entries: Pick<ContinuityEntry, "vehicle_id" | "entry_date">[], vehicleIds: string[], dates: string[]) {
  const declared = new Set(entries.map((entry) => `${entry.vehicle_id}:${entry.entry_date}`));
  return vehicleIds.flatMap((vehicleId) =>
    dates.filter((date) => !declared.has(`${vehicleId}:${date}`)).map((date) => ({ vehicle_id: vehicleId, date }))
  );
}
