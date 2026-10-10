"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Smartphone, XCircle } from "lucide-react";
import { refreshMobileMoneyPayment, startMobileMoneyPayment, type MobileMoneyState } from "@/actions/mobile-money";
import { MOBILE_MONEY_PROVIDERS, guessProvider, providerLabels, type MobileMoneyProvider } from "@/lib/mobile-money/operators";

const initialState: MobileMoneyState = { ok: false, message: "" };
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

type Props = {
  defaultPhone: string | null;
  enabled: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary min-h-12 w-full text-base" disabled={pending}>
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Smartphone size={18} aria-hidden />}
      {pending ? "Envoi de la demande…" : "Payer par Mobile Money"}
    </button>
  );
}

export function MobileMoneyPayForm({ defaultPhone, enabled }: Props) {
  const [startState, formAction] = useFormState(startMobileMoneyPayment, initialState);
  const [tracked, setTracked] = useState<MobileMoneyState | null>(null);
  const [provider, setProvider] = useState<MobileMoneyProvider>(guessProvider(defaultPhone) ?? "VODACOM_MPESA_COD");

  // Suit la transaction jusqu'à la réponse de l'opérateur (le chauffeur tape son PIN).
  useEffect(() => {
    if (startState.status !== "accepted" || !startState.transactionId) return;
    const transactionId = startState.transactionId;
    setTracked(startState);

    const startedAt = Date.now();
    const timer = setInterval(async () => {
      const next = await refreshMobileMoneyPayment(transactionId);
      if (next.status !== "accepted" || Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(timer);
        setTracked(
          next.status === "accepted"
            ? { ...next, message: "Pas encore de réponse de l'opérateur. Le versement apparaîtra dès que le paiement sera confirmé." }
            : next
        );
      } else {
        setTracked(next);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [startState]);

  const current = tracked?.transactionId === startState.transactionId && tracked ? tracked : startState;

  if (!enabled) {
    return (
      <p className="rounded-lg border border-stone-200 px-4 py-3 text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
        Le paiement Mobile Money (M-Pesa, Airtel Money, Orange Money) n&apos;est pas encore activé.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          Montant
          <input className="field mt-1 min-h-12 text-base" name="amount" type="number" min="1" step="any" inputMode="decimal" required />
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-stone-700 dark:text-stone-200">Devise</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["CDF", "USD"] as const).map((currency) => (
              <label key={currency} className="cursor-pointer">
                <input type="radio" name="currency" value={currency} defaultChecked={currency === "CDF"} className="peer sr-only" />
                <span className="flex min-h-12 items-center justify-center rounded-lg border border-stone-300 font-semibold peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 dark:border-stone-600 dark:peer-checked:bg-emerald-950 dark:peer-checked:text-emerald-200">
                  {currency}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          Numéro Mobile Money
          <input
            className="field mt-1 min-h-12 text-base"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={defaultPhone ?? ""}
            placeholder="081 234 5678"
            onChange={(event) => {
              const guessed = guessProvider(event.target.value);
              if (guessed) setProvider(guessed);
            }}
            required
          />
        </label>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          Opérateur
          <select
            className="field mt-1 min-h-12 text-base"
            name="provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as MobileMoneyProvider)}
          >
            {MOBILE_MONEY_PROVIDERS.map((value) => (
              <option key={value} value={value}>
                {providerLabels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {current.message ? (
        <p
          role="status"
          className={[
            "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm",
            current.status === "completed"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : current.status === "accepted"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-200"
                : "bg-red-500/10 text-red-700 dark:text-red-300"
          ].join(" ")}
        >
          {current.status === "completed" ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
          ) : current.status === "accepted" ? (
            <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" aria-hidden />
          ) : (
            <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          )}
          <span>{current.message}</span>
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
