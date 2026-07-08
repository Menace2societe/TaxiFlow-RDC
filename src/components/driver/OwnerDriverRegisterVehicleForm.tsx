"use client";

import { useEffect, useRef } from "react";
import { CarTaxiFront, CheckCircle2, Loader2, PlusCircle, AlertTriangle } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import {
  registerOwnerDriverVehicle,
  type OwnerDriverVehicleActionState
} from "@/actions/vehicles";

const initialState: OwnerDriverVehicleActionState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      id="owner-driver-register-vehicle-submit"
      className="btn-primary w-full"
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <PlusCircle size={16} />
      )}
      {pending ? "Enregistrement en cours…" : "Enregistrer et m'assigner ce véhicule"}
    </button>
  );
}

/**
 * Formulaire réservé aux chauffeurs-patrons (is_owner_driver: true).
 * Crée un véhicule avec owner_id = driver_id = userId connecté.
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
    <div className="space-y-4">
      {/* En-tête du formulaire */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25">
          <CarTaxiFront size={20} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Enregistrer votre véhicule</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            En tant que chauffeur-patron, vous serez automatiquement assigné comme chauffeur de ce
            véhicule.
          </p>
        </div>
      </div>

      {/* Feedback */}
      {state.message && (
        <div
          role={state.ok ? "status" : "alert"}
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            state.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {state.ok ? (
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      <form ref={formRef} action={formAction} className="grid gap-3">
        {/* Marque + Modèle */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="owner-driver-make"
              className="mb-1.5 block text-xs font-medium text-neutral-400"
            >
              Marque <span className="text-red-400">*</span>
            </label>
            <input
              id="owner-driver-make"
              name="make"
              type="text"
              className="field"
              placeholder="Toyota"
              required
              maxLength={60}
            />
          </div>
          <div>
            <label
              htmlFor="owner-driver-model"
              className="mb-1.5 block text-xs font-medium text-neutral-400"
            >
              Modèle <span className="text-red-400">*</span>
            </label>
            <input
              id="owner-driver-model"
              name="model"
              type="text"
              className="field"
              placeholder="Corolla"
              required
              maxLength={60}
            />
          </div>
        </div>

        {/* Plaque d'immatriculation */}
        <div>
          <label
            htmlFor="owner-driver-plate"
            className="mb-1.5 block text-xs font-medium text-neutral-400"
          >
            Plaque d&apos;immatriculation <span className="text-red-400">*</span>
          </label>
          <input
            id="owner-driver-plate"
            name="plate_number"
            type="text"
            className="field uppercase"
            placeholder="KN 1234 A"
            required
            maxLength={20}
          />
        </div>

        {/* Type de véhicule + Objectif */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="owner-driver-type"
              className="mb-1.5 block text-xs font-medium text-neutral-400"
            >
              Type <span className="text-red-400">*</span>
            </label>
            <select
              id="owner-driver-type"
              name="type"
              className="field"
              defaultValue="taxi"
              required
            >
              <option value="taxi">Taxi</option>
              <option value="moto">Moto</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="owner-driver-revenue"
              className="mb-1.5 block text-xs font-medium text-neutral-400"
            >
              Objectif / jour (CDF) <span className="text-red-400">*</span>
            </label>
            <input
              id="owner-driver-revenue"
              name="target_daily_revenue"
              type="number"
              className="field"
              placeholder="15000"
              min="1"
              step="1"
              inputMode="numeric"
              required
            />
          </div>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
