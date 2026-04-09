export type Currency = "USD" | "CDF";
export const DEFAULT_EXCHANGE_RATE = 2800; // 1 USD = 2800 CDF
export function formatAmount(amount: number, currency: Currency): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("fr-CD", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return `${new Intl.NumberFormat("fr-CD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)} FC`;
}
export function toDisplayCurrency(
  amount: number,
  entryCurrency: Currency,
  displayCurrency: Currency,
  entryRate: number
): number {
  if (entryCurrency === displayCurrency) return amount;
  if (displayCurrency === "USD" && entryCurrency === "CDF") return amount / entryRate;
  return amount * entryRate;
}
