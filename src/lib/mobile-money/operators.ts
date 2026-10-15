import { normalizeDrcPhone } from "@/lib/auth/driver-access";

/** Codes opérateur pawaPay pour la RDC. */
export const MOBILE_MONEY_PROVIDERS = ["VODACOM_MPESA_COD", "AIRTEL_COD", "ORANGE_COD"] as const;
export type MobileMoneyProvider = (typeof MOBILE_MONEY_PROVIDERS)[number];
export type MobileMoneyCurrency = "CDF" | "USD";

export const providerLabels: Record<MobileMoneyProvider, string> = {
  VODACOM_MPESA_COD: "M-Pesa (Vodacom)",
  AIRTEL_COD: "Airtel Money",
  ORANGE_COD: "Orange Money"
};

// Préfixes après +243. Africell (90, 91) n'est pas pris en charge par pawaPay.
const prefixToProvider: Record<string, MobileMoneyProvider> = {
  "81": "VODACOM_MPESA_COD",
  "82": "VODACOM_MPESA_COD",
  "83": "VODACOM_MPESA_COD",
  "97": "AIRTEL_COD",
  "98": "AIRTEL_COD",
  "99": "AIRTEL_COD",
  "80": "ORANGE_COD",
  "84": "ORANGE_COD",
  "85": "ORANGE_COD",
  "89": "ORANGE_COD"
};

/** Devine l'opérateur à partir du numéro ; le chauffeur peut toujours corriger. */
export function guessProvider(phone: string | null | undefined): MobileMoneyProvider | null {
  const normalized = normalizeDrcPhone(phone);
  return normalized ? (prefixToProvider[normalized.slice(4, 6)] ?? null) : null;
}

/** Numéro au format pawaPay : chiffres seulement, indicatif sans "+". */
export function toPawapayMsisdn(phone: string): string | null {
  const normalized = normalizeDrcPhone(phone);
  return normalized ? normalized.slice(1) : null;
}

/**
 * Montant au format attendu par pawaPay. M-Pesa n'accepte pas de décimales en CDF ;
 * les autres cas acceptent 2 décimales. Retourne null si le montant n'est pas valide.
 */
export function formatPawapayAmount(
  amount: number,
  currency: MobileMoneyCurrency,
  provider: MobileMoneyProvider
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const decimals = provider === "VODACOM_MPESA_COD" && currency === "CDF" ? 0 : 2;
  const factor = 10 ** decimals;
  const rounded = Math.round(amount * factor) / factor;
  if (rounded <= 0) return null;
  // Pas de zéros inutiles : "15", "15.5", "15.25" (format exigé par l'API).
  return String(rounded);
}

export function isMobileMoneyProvider(value: unknown): value is MobileMoneyProvider {
  return typeof value === "string" && (MOBILE_MONEY_PROVIDERS as readonly string[]).includes(value);
}
