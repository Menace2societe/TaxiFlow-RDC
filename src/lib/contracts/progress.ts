export type ContractProgress = {
  paid: number;
  total: number;
  remaining: number;
  /** 0–100 */
  percent: number;
  /** Jours de versement restants au rythme prévu, ou null si inconnu. */
  daysLeft: number | null;
  /** Date estimée de fin (YYYY-MM-DD), en comptant un versement par jour. */
  estimatedEnd: string | null;
};

/**
 * Avancement d'une location-vente : ce que le chauffeur a déjà versé sur le prix
 * du véhicule, et quand il en deviendra propriétaire au rythme prévu.
 */
export function contractProgress(
  total: number | null,
  paid: number,
  dailyAmount: number | null,
  today: string
): ContractProgress | null {
  if (!total || total <= 0) return null;
  const safePaid = Math.max(paid, 0);
  const remaining = Math.max(total - safePaid, 0);
  const daysLeft = dailyAmount && dailyAmount > 0 ? Math.ceil(remaining / dailyAmount) : null;

  let estimatedEnd: string | null = null;
  if (daysLeft !== null) {
    const [year, month, day] = today.split("-").map(Number);
    estimatedEnd = new Date(Date.UTC(year, month - 1, day + daysLeft, 12)).toISOString().slice(0, 10);
  }

  return {
    paid: safePaid,
    total,
    remaining,
    percent: Math.min(100, Math.round((safePaid / total) * 1000) / 10),
    daysLeft,
    estimatedEnd
  };
}

/** Somme des versements validés depuis le début du contrat. */
export function paidSince(
  payments: { amount: number; payment_date: string; status: string }[],
  startedAt: string | null
): number {
  return payments
    .filter((payment) => (payment.status === "approved" || payment.status === "validated") && (!startedAt || payment.payment_date >= startedAt))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}
