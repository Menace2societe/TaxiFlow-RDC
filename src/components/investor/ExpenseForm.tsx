"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, Loader2, PlusCircle } from "lucide-react";
import { addExpense, type ExpenseActionState } from "@/actions/expenses";
import { expenseCategoryLabels } from "@/lib/finance/profit";
import type { ExpenseCategory } from "@/lib/supabase/types";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

const initialState: ExpenseActionState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full px-6 sm:w-auto" disabled={pending}>
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <PlusCircle size={18} aria-hidden />}
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
      <label className="grid gap-1.5 text-[15px] font-semibold">
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
      <label className="grid gap-1.5 text-[15px] font-semibold">
        Catégorie
        <select name="category" className="field" defaultValue="carburant">
          {(Object.keys(expenseCategoryLabels) as ExpenseCategory[]).map((category) => (
            <option key={category} value={category}>
              {expenseCategoryLabels[category]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-[15px] font-semibold">
        Date
        <input name="expense_date" type="date" className="field" defaultValue={todayInAppTimezone()} required />
      </label>
      <label className="grid gap-1.5 text-[15px] font-semibold">
        Montant
        <input name="amount" type="number" min="1" step="any" inputMode="decimal" className="field" required />
      </label>
      <label className="grid gap-1.5 text-[15px] font-semibold">
        Devise
        <select name="currency" className="field" defaultValue="CDF">
          <option value="CDF">Francs congolais (CDF)</option>
          <option value="USD">USD (converti au taux du jour)</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-[15px] font-semibold">
        Note
        <input name="note" className="field" maxLength={300} placeholder="Ex. : vidange, pneus…" />
      </label>
      <div className="grid gap-3 md:col-span-3">
        {state.message ? (
          <p
            role={state.ok ? "status" : "alert"}
            className={`flex items-start gap-2 rounded-lg border-2 bg-plate-white px-4 py-3 text-[15px] font-semibold ${
              state.ok ? "border-plate-ok text-plate-ok" : "border-plate-bad text-plate-bad"
            }`}
          >
            {state.ok ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
            ) : (
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
            )}
            {state.message}
          </p>
        ) : null}
        <div>
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
