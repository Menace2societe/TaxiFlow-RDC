"use client";

import { useRef, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { assignDriverToVehicle } from "@/actions/investor-fleet";
import type { DashboardVehicle } from "@/lib/dashboard/data";
import type { DriverProfileRow } from "@/lib/dashboard/data";

function SubmitAssign() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-secondary w-full text-[15px]" type="submit" disabled={pending}>
      {pending ? <Loader2 className="mx-auto animate-spin" size={18} aria-hidden /> : "Assigner"}
    </button>
  );
}

type Props = {
  vehicleId: string;
  drivers: DriverProfileRow[];
  vehicles: DashboardVehicle[];
  currentDriverId: string | null;
};

export function InvestorAssignDriverForm({ vehicleId, drivers, vehicles, currentDriverId }: Props) {
  const confirmRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const fd = new FormData(form);
    const driverId = String(fd.get("driver_id") ?? "");
    if (confirmRef.current?.value === "1") {
      return;
    }
    if (!driverId || driverId === "__none__") {
      return;
    }
    const conflict = vehicles.find((v) => v.driver_id === driverId && v.id !== vehicleId);
    if (conflict) {
      e.preventDefault();
      const ok = window.confirm(
        `Ce chauffeur est déjà assigné à « ${conflict.label} » (${conflict.plate_number}). Confirmer la réassignation sur ce véhicule ? L'ancien sera libéré.`
      );
      if (ok && confirmRef.current) {
        confirmRef.current.value = "1";
        form.requestSubmit();
      }
    }
  }

  return (
    <form action={assignDriverToVehicle} onSubmit={onSubmit} className="flex min-w-[160px] flex-col gap-2">
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <input ref={confirmRef} type="hidden" name="confirm_reassign" value="0" />
      <select name="driver_id" aria-label="Chauffeur" className="field" defaultValue={currentDriverId ?? "__none__"}>
        <option value="__none__">Non assigné</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.full_name ?? d.id.slice(0, 8)}
          </option>
        ))}
      </select>
      <SubmitAssign />
    </form>
  );
}
