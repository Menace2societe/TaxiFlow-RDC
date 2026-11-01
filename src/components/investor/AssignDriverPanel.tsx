"use client";

import { useRef } from "react";
import { AlertTriangle, CheckCircle2, Loader2, UserCheck } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { assignDriverToVehicleById, type AssignDriverActionState } from "@/actions/vehicles";
import type { DriverProfileRow } from "@/lib/dashboard/data";

const initialState: AssignDriverActionState = { ok: false, message: "" };

function SubmitAssignButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn-secondary w-full px-3 text-[15px]">
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <UserCheck size={18} aria-hidden />}
      <span className="whitespace-normal leading-tight">{pending ? "Assignation…" : "Confirmer l'assignation"}</span>
    </button>
  );
}

type Props = {
  vehicleId: string;
  vehicleLabel: string;
  drivers: DriverProfileRow[];
  currentDriverId: string | null;
  /** Gardé pour compatibilité : le nom est affiché par la page, sur la ligne du véhicule. */
  currentDriverName: string | null;
  unavailableDriverIds?: string[];
};

export function AssignDriverPanel({
  vehicleId,
  vehicleLabel,
  drivers,
  currentDriverId,
  unavailableDriverIds = []
}: Props) {
  const [state, formAction] = useFormState(
    assignDriverToVehicleById,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const unavailableDrivers = new Set(unavailableDriverIds);

  return (
    <div className="grid gap-3">
      {/* Le chauffeur actuel est affiché sur la ligne du véhicule (Ma flotte). */}
      {/* Formulaire d'assignation */}
      <form ref={formRef} action={formAction} className="grid gap-3">
        <input type="hidden" name="vehicle_id" value={vehicleId} />

        <label htmlFor={`assign-driver-${vehicleId}`} className="block text-[15px] font-semibold">
          Confier {vehicleLabel} à
          <select
            id={`assign-driver-${vehicleId}`}
            name="driver_id"
            className="field mt-1.5"
            defaultValue={currentDriverId ?? ""}
          >
            <option value="">Aucun chauffeur</option>
            {drivers.map((driver) => {
              const isUnavailable = unavailableDrivers.has(driver.id) && driver.id !== currentDriverId;

              return (
                <option key={driver.id} value={driver.id} disabled={isUnavailable}>
                  {driver.full_name ?? driver.id.slice(0, 8)}
                  {driver.phone ? ` · ${driver.phone}` : ""}
                  {isUnavailable ? " · déjà assigné" : ""}
                </option>
              );
            })}
          </select>
        </label>

        {/* Retour */}
        {state.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={`flex items-start gap-2 rounded-lg border-2 bg-plate-white px-3 py-2.5 text-[15px] font-semibold ${
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
        )}

        <SubmitAssignButton />
      </form>
    </div>
  );
}
