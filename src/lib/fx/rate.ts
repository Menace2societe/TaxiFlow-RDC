import "server-only";

/**
 * Taux USD → CDF du jour.
 *
 * Source : open.er-api.com (gratuit, sans clé, mis à jour une fois par jour).
 * Le résultat est mis en cache 6 h par Next.js. Si l'API ne répond pas, on
 * retombe sur USD_CDF_FALLBACK_RATE (ou 2 800).
 */
const RATE_URL = "https://open.er-api.com/v6/latest/USD";
const REVALIDATE_SECONDS = 6 * 60 * 60;

export type UsdCdfRate = {
  rate: number;
  source: "live" | "fallback";
  /** ISO date of the provider's last update, when known. */
  updatedAt: string | null;
};

export function fallbackRate(): UsdCdfRate {
  const configured = Number(process.env.USD_CDF_FALLBACK_RATE);
  return {
    rate: Number.isFinite(configured) && configured > 0 ? configured : 2800,
    source: "fallback",
    updatedAt: null
  };
}

/** Garde-fou : le CDF tourne autour de 2 000–4 000 par USD ; on rejette une valeur aberrante. */
export function parseRateResponse(body: unknown): UsdCdfRate | null {
  if (!body || typeof body !== "object") return null;
  const data = body as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
  const rate = data.rates?.CDF;
  if (data.result !== "success" || typeof rate !== "number" || rate < 500 || rate > 20000) {
    return null;
  }
  return {
    rate: Math.round(rate * 100) / 100,
    source: "live",
    updatedAt: data.time_last_update_unix ? new Date(data.time_last_update_unix * 1000).toISOString() : null
  };
}

export async function getUsdToCdfRate(): Promise<UsdCdfRate> {
  try {
    const response = await fetch(RATE_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) return fallbackRate();
    return parseRateResponse(await response.json()) ?? fallbackRate();
  } catch {
    return fallbackRate();
  }
}

export function usdToCdf(amountUsd: number, rate: number): number {
  return Math.round(amountUsd * rate);
}
