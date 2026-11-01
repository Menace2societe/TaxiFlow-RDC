"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteVehicle } from "@/actions/vehicles";

function SubmitDelete({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-danger min-h-[48px] px-4 text-[15px]"
      disabled={pending}
      aria-label={`Supprimer le véhicule ${label}`}
      title="Supprimer le véhicule"
    >
      {pending ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Trash2 size={18} aria-hidden />}
      Supprimer
    </button>
  );
}

export function InvestorDeleteVehicleForm({ vehicleId, label }: { vehicleId: string; label: string }) {
  return (
    <form
      action={deleteVehicle}
      onSubmit={(e) => {
        if (!window.confirm(`Supprimer définitivement « ${label} » ? Les recettes liées restent en base si contraintes.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <SubmitDelete label={label} />
    </form>
  );
}
