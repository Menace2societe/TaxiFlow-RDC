"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteVehicle } from "@/actions/vehicles";

function SubmitDelete() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-danger min-h-10 px-3 text-xs"
      disabled={pending}
      aria-label="Supprimer le vehicule"
      title="Supprimer le vehicule"
    >
      {pending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
    </button>
  );
}

export function InvestorDeleteVehicleForm({ vehicleId, label }: { vehicleId: string; label: string }) {
  return (
    <form
      action={deleteVehicle}
      onSubmit={(e) => {
        if (!window.confirm(`Supprimer definitivement « ${label} » ? Les recettes liees restent en base si contraintes.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <SubmitDelete />
    </form>
  );
}
