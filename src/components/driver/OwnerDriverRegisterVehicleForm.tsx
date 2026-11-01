"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Loader2, PlusCircle } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import {
  registerOwnerDriverVehicle,
  type OwnerDriverVehicleActionState
} from "@/actions/vehicles";

const initialState: OwnerDriverVehicleActionState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} id="owner-driver-register-vehicle-submit" className="btn-primary w-full">
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <PlusCircle size={18} aria-hidden />}
      <span className="whitespace-normal leading-tight">
        {pending ? "Enregistrement…" : "Enregistrer mon véhicule"}
      </span>
    </button>
  );
}

/**
 * Formulaire réservé aux chauffeurs-patrons (is_owner_driver: true).
 * Crée un véhicule avec owner_id = driver_id = userId connecté.
 * Le titre et l'explication sont posés par la page qui l'affiche.
 */
export function OwnerDriverRegisterVehicleForm() {
  const [state, formAction] = useFormState(registerOwnerDriverVehicle, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Réinitialiser le formulaire après succès
  useEffect(() => {
    if (state.ok && state.message) {
      formRef.current?.reset();
    }
  }, [state.ok, state.message]);

  return (
    <div className="grid gap-4">
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
          <span>{state.message}</span>
        </p>
      ) : null}

      <form ref={formRef} action={formAction} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="owner-driver-make" className="block text-[15px] font-semibold">
            Marque
            <input
              id="owner-driver-make"
              name="make"
              type="text"
              className="field mt-1.5"
              placeholder="Ex. : Toyota"
              required
              maxLength={60}
            />
          </label>
          <label htmlFor="owner-driver-model" className="block text-[15px] font-semibold">
            Modèle
            <input
              id="owner-driver-model"
              name="model"
              type="text"
              className="field mt-1.5"
              placeholder="Ex. : Corolla"
              required
              maxLength={60}
            />
          </label>
        </div>

        <label htmlFor="owner-driver-plate" className="block text-[15px] font-semibold">
          Numéro de plaque
          <input
            id="owner-driver-plate"
            name="plate_number"
            type="text"
            className="field mt-1.5 font-plate text-[22px] font-bold tracking-[0.03em]"
            placeholder="Ex. : 4821 BK 01"
            autoCapitalize="characters"
            autoComplete="off"
            required
            maxLength={20}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="owner-driver-type" className="block text-[15px] font-semibold">
            Type
            <select id="owner-driver-type" name="type" className="field mt-1.5" defaultValue="taxi" required>
              <option value="taxi">Taxi</option>
              <option value="moto">Moto-taxi</option>
            </select>
          </label>
          <label htmlFor="owner-driver-revenue" className="block text-[15px] font-semibold">
            Versement attendu par jour (FC)
            <input
              id="owner-driver-revenue"
              name="target_daily_revenue"
              type="number"
              className="field mt-1.5"
              placeholder="Ex. : 15000"
              min="1"
              step="1"
              inputMode="numeric"
              required
            />
          </label>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
