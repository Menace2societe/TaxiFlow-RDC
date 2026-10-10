/**
 * Règle anti-fraude kilométrique — doit rester identique à la colonne générée
 * daily_entries.is_suspicious (migration 20261010120000). Montant en CDF.
 */
export const SUSPICIOUS_DISTANCE_KM = 50;
export const SUSPICIOUS_MAX_DECLARED_CDF = 5000;

export function distanceCovered(startKm: number, endKm: number): number {
  return Math.max(endKm - startKm, 0);
}

export function isSuspiciousEntry(startKm: number, endKm: number, declaredAmount: number): boolean {
  return distanceCovered(startKm, endKm) > SUSPICIOUS_DISTANCE_KM && declaredAmount <= SUSPICIOUS_MAX_DECLARED_CDF;
}

export function suspicionReason(distanceKm: number, declaredAmount: number): string {
  return `${distanceKm.toLocaleString("fr-CD")} km parcourus pour ${declaredAmount.toLocaleString("fr-CD")} déclarés`;
}
