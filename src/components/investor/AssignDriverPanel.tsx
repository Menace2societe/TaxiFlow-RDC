"use client";

import { useRef } from "react";
import { Loader2, UserCheck, UserX, Users } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { assignDriverToVehicleById, type AssignDriverActionState } from "@/actions/vehicles";
import type { DriverProfileRow } from "@/lib/dashboard/data";

const initialState: AssignDriverActionState = { ok: false, message: "" };

function SubmitAssignButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary min-h-9 w-full text-xs"
    >
      {pending
        ? <Loader2 size={14} className="animate-spin" />
        : <UserCheck size={14} />}
      {pending ? "Assignation..." : "Confirmer l'assignation"}
    </button>
  );
}

type Props = {
  vehicleId: string;
  vehicleLabel: string;
  drivers: DriverProfileRow[];
  currentDriverId: string | null;
  currentDriverName: string | null;
  unavailableDriverIds?: string[];
};

export function AssignDriverPanel({
  vehicleId,
  vehicleLabel,
  drivers,
  currentDriverId,
  currentDriverName,
  unavailableDriverIds = []
}: Props) {
  const [state, formAction] = useFormState(
    assignDriverToVehicleById,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const unavailableDrivers = new Set(unavailableDriverIds);

  return (
    <div className="space-y-3">
      {/* Chauffeur actuel */}
      <div className="flex items-center gap-2.5 rounded-lg border border-neutral-800 bg-neutral-950/50 px-4 py-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          currentDriverId
            ? "bg-emerald-500/10 border border-emerald-500/20"
            : "bg-neutral-800 border border-neutral-700"
        }`}>
          {currentDriverId
            ? <UserCheck size={15} className="text-emerald-400" />
            : <UserX size={15} className="text-neutral-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-neutral-500">Chauffeur actuel</p>
          <p className="text-sm font-semibold text-white truncate">
            {currentDriverName ?? "Non assigné"}
          </p>
        </div>
      </div>

      {/* Formulaire d'assignation */}
      <form ref={formRef} action={formAction} className="space-y-3">
        <input type="hidden" name="vehicle_id" value={vehicleId} />

        <div>
          <label
            htmlFor={`assign-driver-${vehicleId}`}
            className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400"
          >
            <Users size={12} />
            Assigner un chauffeur à {vehicleLabel}
          </label>
          <select
            id={`assign-driver-${vehicleId}`}
            name="driver_id"
            className="field text-sm"
            defaultValue={currentDriverId ?? ""}
          >
            <option value="">— Aucun chauffeur —</option>
            {drivers.map((driver) => {
              const isUnavailable = unavailableDrivers.has(driver.id) && driver.id !== currentDriverId;

              return (
                <option key={driver.id} value={driver.id} disabled={isUnavailable}>
                  {driver.full_name ?? driver.id.slice(0, 8)}
                  {driver.phone ? ` - ${driver.phone}` : ""}
                  {isUnavailable ? " - deja assigne" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* Feedback */}
        {state.message && (
          <p className={`rounded-lg px-3 py-2 text-xs font-medium ${
            state.ok
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border border-red-500/30 bg-red-500/10 text-red-300"
          }`}>
            {state.message}
          </p>
        )}

        <SubmitAssignButton />
      </form>
    </div>
  );
}
