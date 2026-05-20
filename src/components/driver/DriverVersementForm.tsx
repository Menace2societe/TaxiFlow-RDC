"use client";

import { Loader2, PlusCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { createDriverDailyEntry } from "@/actions/entries";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary min-h-12 w-full text-base" type="submit" disabled={disabled || pending}>
      {pending ? <Loader2 className="animate-spin" size={20} aria-hidden /> : <PlusCircle size={20} aria-hidden />}
      {pending ? "Enregistrement..." : "Enregistrer mon versement"}
    </button>
  );
}

type Props = {
  hasVehicle: boolean;
};

export function DriverVersementForm({ hasVehicle }: Props) {
  return (
    <form
      action={createDriverDailyEntry}
      className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-soft dark:border-stone-800 dark:bg-stone-950"
    >
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Date
        <input className="field mt-1 min-h-12 text-base" name="entry_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Montant
        <input className="field mt-1 min-h-12 text-base" name="amount" type="number" min="1" step="1" inputMode="decimal" required />
      </label>
      <fieldset className="text-sm font-medium text-stone-700 dark:text-stone-200">
        <legend className="mb-2">Devise</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer">
            <input type="radio" name="currency" value="CDF" defaultChecked className="peer sr-only" />
            <div className="flex min-h-12 items-center justify-center rounded-lg border border-stone-300 font-semibold peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 dark:border-stone-600 dark:peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-950 dark:peer-checked:text-emerald-200">
              CDF
            </div>
          </label>
          <label className="cursor-pointer">
            <input type="radio" name="currency" value="USD" className="peer sr-only" />
            <div className="flex min-h-12 items-center justify-center rounded-lg border border-stone-300 font-semibold peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 dark:border-stone-600 dark:peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-950 dark:peer-checked:text-emerald-200">
              USD
            </div>
          </label>
        </div>
      </fieldset>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Kilometrage
        <input className="field mt-1 min-h-12 text-base" name="mileage_km" type="number" min="1" step="1" inputMode="decimal" required />
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Note (optionnel)
        <input className="field mt-1 min-h-12 text-base" name="notes" placeholder="Course, client..." />
      </label>
      <SubmitButton disabled={!hasVehicle} />
    </form>
  );
}
