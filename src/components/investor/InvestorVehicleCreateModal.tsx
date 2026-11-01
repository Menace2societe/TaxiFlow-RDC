"use client";

import { useState } from "react";
import { Loader2, PlusCircle, X } from "lucide-react";
import { useFormStatus } from "react-dom";
import { createVehicle } from "@/actions/vehicles";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full px-5 sm:w-auto" type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <PlusCircle size={18} aria-hidden />}
      {pending ? "Enregistrement…" : "Ajouter le véhicule"}
    </button>
  );
}

/** `variant="secondary"` quand un autre bouton bleu est déjà à l'écran (une seule action principale par vue). */
export function InvestorVehicleCreateModal({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={variant === "primary" ? "btn-primary px-5" : "btn-secondary px-5"}
        onClick={() => setOpen(true)}
      >
        <PlusCircle size={18} aria-hidden />
        Ajouter un véhicule
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-plate-ink/40 p-4 md:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="vehicle-create-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border-2 border-plate-ink bg-plate-white p-5 text-plate-ink">
            <div className="flex items-start justify-between gap-3">
              <h2 id="vehicle-create-title" className="font-plate text-[24px] font-bold leading-tight">
                Nouveau véhicule
              </h2>
              <button
                type="button"
                className="-mr-2 -mt-2 inline-flex h-12 w-12 items-center justify-center rounded-lg hover:bg-plate-ground"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
              >
                <X size={22} aria-hidden />
              </button>
            </div>
            <form action={createVehicle} className="mt-4 grid gap-4">
              <label className="block text-[15px] font-semibold">
                Marque et modèle
                <input className="field mt-1.5" name="label" required minLength={2} placeholder="Toyota Noah" />
              </label>
              <label className="block text-[15px] font-semibold">
                Plaque
                <input className="field mt-1.5" name="plate_number" required minLength={3} placeholder="4821 BK 01" />
              </label>
              <label className="block text-[15px] font-semibold">
                Type
                <select className="field mt-1.5" name="type" defaultValue="taxi">
                  <option value="taxi">Taxi</option>
                  <option value="moto">Moto-taxi</option>
                </select>
              </label>
              <label className="block text-[15px] font-semibold">
                Versement attendu par jour (FC)
                <input
                  className="field mt-1.5"
                  name="target_daily_revenue"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  required
                />
              </label>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-secondary w-full px-5 sm:w-auto" onClick={() => setOpen(false)}>
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
