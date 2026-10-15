"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, PlusCircle } from "lucide-react";
import { addExpense, type ExpenseActionState } from "@/actions/expenses";
import { expenseCategoryLabels } from "@/lib/finance/profit";
import type { ExpenseCategory } from "@/lib/supabase/types";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

const initialState: ExpenseActionState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary min-h-11" disabled={pending}>
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <PlusCircle size={16} aria-hidden />}
      Ajouter la dépense
    </button>
  );
}

export function ExpenseForm({ vehicles }: { vehicles: { id: string; label: string; plate_number: string }[] }) {
  const [state, formAction] = useFormState(addExpense, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 md:grid-cols-3">
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Véhicule
        <select name="vehicle_id" className="field" required defaultValue="">
          <option value="" disabled>
            Choisir…
          </option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label} · {vehicle.plate_number}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Catégorie
        <select name="category" className="field" defaultValue="carburant">
          {(Object.keys(expenseCategoryLabels) as ExpenseCategory[]).map((category) => (
            <option key={category} value={category}>
              {expenseCategoryLabels[category]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Date
        <input name="expense_date" type="date" className="field" defaultValue={todayInAppTimezone()} required />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Montant
        <input name="amount" type="number" min="1" step="any" inputMode="decimal" className="field" required />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Devise
        <select name="currency" className="field" defaultValue="CDF">
          <option value="CDF">CDF</option>
          <option value="USD">USD (converti au taux du jour)</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Note
        <input name="note" className="field" maxLength={300} placeholder="Ex. vidange, pneus…" />
      </label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-3">
        <SubmitButton />
        {state.message ? (
          <p role="status" className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
