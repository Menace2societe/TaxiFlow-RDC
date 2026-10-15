"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Banknote, Loader2 } from "lucide-react";
import { recordCashSubscription, type CashPaymentState } from "@/actions/billing";

const initialState: CashPaymentState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary min-h-10 px-3" disabled={pending}>
      {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Banknote size={14} aria-hidden />}
      Encaisser
    </button>
  );
}

/** Abonnement réglé en espèces : l'admin saisit la durée et le montant reçu. */
export function CashSubscriptionForm({ ownerId, accessLabel }: { ownerId: string; accessLabel: string }) {
  const [state, formAction] = useFormState(recordCashSubscription, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5 md:items-end">
      <input type="hidden" name="owner_id" value={ownerId} />
      <p className="text-xs text-stone-400">{accessLabel}</p>
      <div className="flex flex-wrap items-center gap-2">
        <select name="months" className="field min-h-10 w-24 py-1.5 text-sm" defaultValue="1" aria-label="Durée">
          {[1, 3, 6, 12].map((months) => (
            <option key={months} value={months}>
              {months} mois
            </option>
          ))}
        </select>
        <input
          name="amount"
          type="number"
          min="1"
          step="any"
          className="field min-h-10 w-28 py-1.5 text-sm"
          placeholder="Montant"
          aria-label="Montant encaissé"
          required
        />
        <select name="currency" className="field min-h-10 w-20 py-1.5 text-sm" defaultValue="USD" aria-label="Devise">
          <option value="USD">USD</option>
          <option value="CDF">CDF</option>
        </select>
        <SubmitButton />
      </div>
      {state.message ? <p className={`text-xs ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p> : null}
    </form>
  );
}
