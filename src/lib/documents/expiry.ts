/** Seuils d'alerte avant l'expiration d'un document (en jours). */
export const EXPIRY_REMINDER_DAYS = [30, 7, 0] as const;

export type ExpiryState = "expired" | "soon" | "ok" | "unknown";

/** Jours entre aujourd'hui et la date d'expiration (négatif si expiré). Dates YYYY-MM-DD. */
export function daysUntil(expiresAt: string, today: string): number {
  const toUtc = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  return Math.round((toUtc(expiresAt) - toUtc(today)) / 86_400_000);
}

export function expiryState(expiresAt: string | null | undefined, today: string, soonDays = 30): ExpiryState {
  if (!expiresAt) return "unknown";
  const days = daysUntil(expiresAt, today);
  if (days < 0) return "expired";
  if (days <= soonDays) return "soon";
  return "ok";
}

/**
 * Seuil de rappel atteint aujourd'hui (30, 7 ou 0 = expiré), ou null si trop tôt.
 * Chaque seuil n'est envoyé qu'une fois (clé de déduplication = document + seuil),
 * et un jour de cron manqué ne fait pas sauter le rappel.
 */
export function reminderThreshold(expiresAt: string, today: string): number | null {
  const days = daysUntil(expiresAt, today);
  const reached = EXPIRY_REMINDER_DAYS.filter((threshold) => days <= threshold);
  return reached.length ? Math.min(...reached) : null;
}

export function expiryLabel(expiresAt: string | null | undefined, today: string): string {
  if (!expiresAt) return "Sans date d'expiration";
  const days = daysUntil(expiresAt, today);
  if (days < 0) return `Expiré depuis ${-days} jour(s)`;
  if (days === 0) return "Expire aujourd'hui";
  return `Expire dans ${days} jour(s)`;
}
