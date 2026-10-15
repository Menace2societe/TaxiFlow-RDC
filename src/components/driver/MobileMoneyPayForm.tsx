"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Smartphone } from "lucide-react";
import { refreshMobileMoneyPayment, startMobileMoneyPayment, type MobileMoneyState } from "@/actions/mobile-money";
import { PaymentStatusNotice } from "@/components/shared/PaymentStatusNotice";
import { useMobileMoneyTracking } from "@/components/shared/useMobileMoneyTracking";
import { MOBILE_MONEY_PROVIDERS, guessProvider, providerLabels, type MobileMoneyProvider } from "@/lib/mobile-money/operators";

const initialState: MobileMoneyState = { ok: false, message: "" };

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
  const [provider, setProvider] = useState<MobileMoneyProvider>(guessProvider(defaultPhone) ?? "VODACOM_MPESA_COD");
  const current = useMobileMoneyTracking(startState, refreshMobileMoneyPayment);

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

      <PaymentStatusNotice payment={current} />

      <SubmitButton />
    </form>
  );
}
