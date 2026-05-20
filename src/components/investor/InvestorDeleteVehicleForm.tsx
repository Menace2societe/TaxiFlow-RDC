"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteVehicle } from "@/actions/vehicles";

function SubmitDelete() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-red-200 px-2 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
      disabled={pending}
      aria-label="Supprimer le vehicule"
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
