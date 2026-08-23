"use client";

import { PlusCircle, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { createDailyEntry } from "@/actions/entries";
import type { DashboardVehicle } from "@/lib/dashboard/data";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full md:w-auto" type="submit" disabled={disabled || pending}>
      {pending ? (
        <Loader2 className="animate-spin" size={18} aria-hidden />
      ) : (
        <PlusCircle size={18} aria-hidden />
      )}
      {pending ? "Enregistrement..." : "Enregistrer la recette"}
    </button>
  );
}

export function DailyEntryForm({ vehicles }: { vehicles: DashboardVehicle[] }) {
  return (
    <form action={createDailyEntry} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-soft dark:border-stone-800 dark:bg-stone-950 md:grid-cols-2 md:p-5">
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Vehicule
        <select className="field mt-1" name="vehicle_id" required>
          <option value="">Selectionner</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label} - {vehicle.plate_number} ({vehicle.driver_name ?? "sans chauffeur"})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Date
        <input className="field mt-1" name="entry_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Montant
        <input className="field mt-1" name="amount" type="number" min="1" step="1" inputMode="decimal" required />
      </label>
      <fieldset className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        <legend className="mb-1">Devise</legend>
        <div className="flex h-[48px] gap-2">
          <label className="flex-1 cursor-pointer">
            <input type="radio" name="currency" value="CDF" defaultChecked className="peer sr-only" />
            <div className="flex h-full items-center justify-center rounded-md border border-stone-300 bg-stone-50 font-semibold text-stone-600 transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:peer-checked:border-emerald-500/50 dark:peer-checked:bg-emerald-500/10 dark:peer-checked:text-emerald-300">
              CDF
            </div>
          </label>
          <label className="flex-1 cursor-pointer">
            <input type="radio" name="currency" value="USD" className="peer sr-only" />
            <div className="flex h-full items-center justify-center rounded-md border border-stone-300 bg-stone-50 font-semibold text-stone-600 transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:peer-checked:border-emerald-500/50 dark:peer-checked:bg-emerald-500/10 dark:peer-checked:text-emerald-300">
              USD
            </div>
          </label>
        </div>
      </fieldset>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Kilometrage de debut
        <input className="field mt-1" name="start_km" type="number" min="0" step="0.1" inputMode="decimal" required />
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Kilometrage de fin
        <input className="field mt-1" name="end_km" type="number" min="0" step="0.1" inputMode="decimal" required />
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Note
        <input className="field mt-1" name="notes" placeholder="Ex: course aeroport, avance..." />
      </label>
      <div className="md:col-span-2">
        <SubmitButton disabled={vehicles.length === 0} />
      </div>
    </form>
  );
}
