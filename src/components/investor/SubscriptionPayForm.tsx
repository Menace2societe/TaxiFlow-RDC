"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Smartphone } from "lucide-react";
import { refreshSubscriptionPayment, startSubscriptionPayment, type BillingPaymentState } from "@/actions/billing";
import { PaymentStatusNotice } from "@/components/shared/PaymentStatusNotice";
import { useMobileMoneyTracking } from "@/components/shared/useMobileMoneyTracking";
import { BILLING_PERIODS, periodPriceUsd } from "@/lib/billing/plans";
import { MOBILE_MONEY_PROVIDERS, guessProvider, providerLabels, type MobileMoneyProvider } from "@/lib/mobile-money/operators";

const initialState: BillingPaymentState = { ok: false, message: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Smartphone size={18} aria-hidden />}
      {pending ? "Envoi de la demande…" : label}
    </button>
  );
}

type Props = {
  monthlyUsd: number;
  usdRate: number;
  defaultPhone: string | null;
};

export function SubscriptionPayForm({ monthlyUsd, usdRate, defaultPhone }: Props) {
  const [startState, formAction] = useFormState(startSubscriptionPayment, initialState);
  const current = useMobileMoneyTracking(startState, refreshSubscriptionPayment);
  const [months, setMonths] = useState<number>(1);
  const [currency, setCurrency] = useState<"USD" | "CDF">("USD");
  const [provider, setProvider] = useState<MobileMoneyProvider>(guessProvider(defaultPhone) ?? "VODACOM_MPESA_COD");

  // Indicatif : le montant facturé est recalculé par le serveur.
  const priceUsd = periodPriceUsd(monthlyUsd, months);
  const shown =
    currency === "USD"
      ? `${priceUsd.toLocaleString("fr-CD")} USD`
      : `${Math.round(priceUsd * usdRate).toLocaleString("fr-CD")} CDF`;

  return (
    <form action={formAction} className="space-y-4">
      <fieldset>
        <legend className="text-[15px] font-semibold">Durée</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BILLING_PERIODS.map((period) => (
            <label key={period.months} className="cursor-pointer">
              <input
                type="radio"
                name="months"
                value={period.months}
                checked={months === period.months}
                onChange={() => setMonths(period.months)}
                className="peer sr-only"
              />
              <span className="flex min-h-[52px] items-center justify-center rounded-xl border-2 border-plate-ink/70 bg-plate-white px-2 text-center text-[16px] font-bold hover:border-plate-ink peer-checked:border-plate-ink peer-checked:bg-plate-ink peer-checked:text-plate-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-plate-band">
                {period.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-[15px] font-semibold">
          Devise
          <select
            name="currency"
            className="field"
            value={currency}
            onChange={(event) => setCurrency(event.target.value === "CDF" ? "CDF" : "USD")}
          >
            <option value="USD">USD</option>
            <option value="CDF">Francs congolais (CDF, taux du jour)</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-[15px] font-semibold">
          Numéro Mobile Money
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            className="field"
            defaultValue={defaultPhone ?? ""}
            placeholder="081 234 5678"
            onChange={(event) => {
              const guessed = guessProvider(event.target.value);
              if (guessed) setProvider(guessed);
            }}
            required
          />
        </label>
        <label className="grid gap-1.5 text-[15px] font-semibold">
          Opérateur
          <select
            name="provider"
            className="field"
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
      <SubmitButton label={`Payer ${shown}`} />
    </form>
  );
}
