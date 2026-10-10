import "server-only";

import type { MobileMoneyCurrency, MobileMoneyProvider } from "./operators";

/**
 * Client minimal de l'API pawaPay v2 (dépôts = argent reçu du chauffeur).
 * Doc : https://docs.pawapay.io/v2/api-reference/deposits/initiate-deposit
 *
 * PAWAPAY_API_TOKEN  jeton de l'espace marchand (sandbox ou production)
 * PAWAPAY_ENV        "sandbox" (défaut) ou "live"
 */

export type PawapayDepositStatus = "ACCEPTED" | "PROCESSING" | "IN_RECONCILIATION" | "COMPLETED" | "FAILED";

export type InitiateDepositResult =
  | { ok: true; status: "ACCEPTED" | "DUPLICATE_IGNORED" }
  | { ok: false; status: "REJECTED" | "ERROR"; reason: string };

export type DepositLookup =
  | { found: true; status: PawapayDepositStatus; providerTransactionId: string | null; failureReason: string | null }
  | { found: false };

export function isPawapayConfigured(): boolean {
  return Boolean(process.env.PAWAPAY_API_TOKEN);
}

function baseUrl(): string {
  return process.env.PAWAPAY_ENV === "live" ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";
}

async function pawapayFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${process.env.PAWAPAY_API_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
}

export async function initiateDeposit(input: {
  depositId: string;
  msisdn: string;
  provider: MobileMoneyProvider;
  amount: string;
  currency: MobileMoneyCurrency;
  clientReferenceId: string;
}): Promise<InitiateDepositResult> {
  try {
    const response = await pawapayFetch("/v2/deposits", {
      method: "POST",
      body: JSON.stringify({
        depositId: input.depositId,
        payer: { type: "MMO", accountDetails: { phoneNumber: input.msisdn, provider: input.provider } },
        amount: input.amount,
        currency: input.currency,
        clientReferenceId: input.clientReferenceId,
        // 4 à 22 caractères, lettres / chiffres / espaces uniquement
        customerMessage: "Versement TaxiFlow"
      })
    });

    const body = (await response.json().catch(() => null)) as {
      status?: string;
      failureReason?: { failureCode?: string; failureMessage?: string };
    } | null;

    if (body?.status === "ACCEPTED" || body?.status === "DUPLICATE_IGNORED") {
      return { ok: true, status: body.status };
    }

    const reason = body?.failureReason?.failureMessage ?? body?.failureReason?.failureCode ?? `HTTP ${response.status}`;
    return { ok: false, status: body?.status === "REJECTED" ? "REJECTED" : "ERROR", reason };
  } catch (error) {
    return { ok: false, status: "ERROR", reason: (error as Error).message };
  }
}

/** Source de vérité du statut : on ne fait jamais confiance au corps d'un callback. */
export async function getDeposit(depositId: string): Promise<DepositLookup> {
  const response = await pawapayFetch(`/v2/deposits/${encodeURIComponent(depositId)}`);
  if (!response.ok) {
    throw new Error(`pawaPay HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    status?: "FOUND" | "NOT_FOUND";
    data?: {
      status?: PawapayDepositStatus;
      providerTransactionId?: string;
      failureReason?: { failureCode?: string; failureMessage?: string };
    };
  };

  if (body.status !== "FOUND" || !body.data?.status) {
    return { found: false };
  }

  return {
    found: true,
    status: body.data.status,
    providerTransactionId: body.data.providerTransactionId ?? null,
    failureReason: body.data.failureReason?.failureMessage ?? body.data.failureReason?.failureCode ?? null
  };
}
