"use client";

import { useState } from "react";
import { Loader2, PlusCircle, X } from "lucide-react";
import { useFormStatus } from "react-dom";
import { createVehicle } from "@/actions/vehicles";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary min-h-10 w-full md:w-auto" type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <PlusCircle size={18} aria-hidden />}
      {pending ? "Enregistrement..." : "Ajouter le vehicule"}
    </button>
  );
}

export function InvestorVehicleCreateModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-primary min-h-10 px-4" onClick={() => setOpen(true)}>
        Ajouter un vehicule
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center" role="dialog" aria-modal>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-stone-200 bg-white p-5 shadow-lg dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">Nouveau vehicule</h2>
              <button type="button" className="rounded-md p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900" onClick={() => setOpen(false)} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>
            <form action={createVehicle} className="mt-4 grid gap-4">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Libelle (marque / modele)
                <input className="field mt-1" name="label" required minLength={2} placeholder="Toyota Noah" />
              </label>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Plaque
                <input className="field mt-1" name="plate_number" required minLength={3} placeholder="KN 4215 AB" />
              </label>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Type
                <select className="field mt-1" name="type" defaultValue="taxi">
                  <option value="taxi">Taxi</option>
                  <option value="moto">Moto</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                Objectif journalier (CDF)
                <input className="field mt-1" name="target_daily_revenue" type="number" min="1" step="1" required />
              </label>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-secondary min-h-10 w-full sm:w-auto" onClick={() => setOpen(false)}>
                  Annuler
                </button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
