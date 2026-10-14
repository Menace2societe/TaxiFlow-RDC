/**
 * Grille tarifaire TaxiFlow : un seul endroit à modifier pour changer les prix.
 * Prix en USD par véhicule et par mois ; payables en USD ou en CDF au taux du jour.
 */
export const PRICE_PER_VEHICLE_USD = { moto: 4, taxi: 9 } as const;
export const FREE_VEHICLES = 1;
export const TRIAL_DAYS = 30;
/** Remise selon la taille de la flotte (véhicules payants). */
export const VOLUME_DISCOUNTS = [
  { minVehicles: 30, percent: 20 },
  { minVehicles: 10, percent: 10 }
] as const;
/** Durées proposées ; 12 mois = 2 mois offerts. */
export const BILLING_PERIODS = [
  { months: 1, payMonths: 1, label: "1 mois" },
  { months: 3, payMonths: 3, label: "3 mois" },
  { months: 6, payMonths: 6, label: "6 mois" },
  { months: 12, payMonths: 10, label: "12 mois (2 offerts)" }
] as const;

export type VehicleKind = keyof typeof PRICE_PER_VEHICLE_USD;

export type MonthlyQuote = {
  vehicles: number;
  freeVehicles: number;
  billableVehicles: number;
  subtotalUsd: number;
  discountPercent: number;
  totalUsd: number;
};

/** Le véhicule offert est le moins cher : le client paie le juste prix des autres. */
export function monthlyQuote(vehicleTypes: string[]): MonthlyQuote {
  const prices = vehicleTypes
    .map((type) => PRICE_PER_VEHICLE_USD[type === "moto" ? "moto" : "taxi"])
    .sort((a, b) => a - b);
  const billable = prices.slice(FREE_VEHICLES);
  const subtotal = billable.reduce((sum, price) => sum + price, 0);
  const discountPercent = VOLUME_DISCOUNTS.find((tier) => billable.length >= tier.minVehicles)?.percent ?? 0;

  return {
    vehicles: prices.length,
    freeVehicles: prices.length - billable.length,
    billableVehicles: billable.length,
    subtotalUsd: subtotal,
    discountPercent,
    totalUsd: Math.round(subtotal * (1 - discountPercent / 100) * 100) / 100
  };
}

export function periodPriceUsd(monthlyUsd: number, months: number): number {
  const period = BILLING_PERIODS.find((option) => option.months === months);
  return Math.round(monthlyUsd * (period?.payMonths ?? months) * 100) / 100;
}

export type SubscriptionState = {
  status: "trial" | "active" | "expired";
  /** Date jusqu'à laquelle l'accès complet est ouvert (YYYY-MM-DD). */
  accessUntil: string;
  daysLeft: number;
};

export function subscriptionState(
  subscription: { trial_ends_at: string; paid_until: string | null },
  today: string
): SubscriptionState {
  const accessUntil = [subscription.trial_ends_at, subscription.paid_until ?? ""].sort().at(-1)!;
  const toUtc = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  const daysLeft = Math.round((toUtc(accessUntil) - toUtc(today)) / 86_400_000);

  if (daysLeft < 0) return { status: "expired", accessUntil, daysLeft };
  const paid = subscription.paid_until !== null && subscription.paid_until >= today;
  return { status: paid ? "active" : "trial", accessUntil, daysLeft };
}

/** Avec un abonnement expiré, seuls les véhicules gratuits restent ajoutables. */
export function canAddVehicle(state: SubscriptionState, currentVehicles: number): boolean {
  return state.status !== "expired" || currentVehicles < FREE_VEHICLES;
}
