"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { FileSignature, Loader2 } from "lucide-react";
import { createContract, type ContractActionState } from "@/actions/contracts";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

const initialState: ContractActionState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary min-h-11" disabled={pending}>
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <FileSignature size={16} aria-hidden />}
      Enregistrer le contrat
    </button>
  );
}

type Props = {
  drivers: { id: string; full_name: string | null }[];
  vehicles: { id: string; label: string; plate_number: string; driver_id: string | null }[];
};

export function ContractForm({ drivers, vehicles }: Props) {
  const [state, formAction] = useFormState(createContract, initialState);
  const [type, setType] = useState<"employe" | "location_vente">("location_vente");
  const [driverId, setDriverId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setDriverId("");
    }
  }, [state]);

  // Pré-sélectionne le véhicule actuellement confié au chauffeur.
  const assignedVehicleId = vehicles.find((vehicle) => vehicle.driver_id === driverId)?.id ?? "";

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Chauffeur
        <select name="driver_id" className="field" required value={driverId} onChange={(event) => setDriverId(event.target.value)}>
          <option value="" disabled>
            Choisir…
          </option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.full_name ?? "Chauffeur sans nom"}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Véhicule
        <select key={assignedVehicleId} name="vehicle_id" className="field" required defaultValue={assignedVehicleId}>
          <option value="" disabled>
            Choisir…
          </option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label} · {vehicle.plate_number}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="md:col-span-2">
        <legend className="text-sm font-medium text-neutral-300">Type de contrat</legend>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["location_vente", "Location-vente", "Le chauffeur rachète le véhicule par ses versements."],
              ["employe", "Chauffeur employé", "Versement journalier, le véhicule reste à vous."]
            ] as const
          ).map(([value, label, help]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="contract_type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="peer sr-only"
              />
              <span className="block rounded-lg border border-neutral-700 p-3 peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10">
                <span className="block font-semibold text-white">{label}</span>
                <span className="block text-xs text-neutral-400">{help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {type === "location_vente" ? (
        <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
          Prix total du véhicule (CDF)
          <input name="possession_total_cdf" type="number" min="1" step="1" className="field" required />
        </label>
      ) : null}
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Versement journalier attendu (CDF)
        <input name="daily_amount_cdf" type="number" min="0" step="1" className="field" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Début du contrat
        <input name="started_at" type="date" className="field" defaultValue={todayInAppTimezone()} required />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-neutral-300">
        Note
        <input name="notes" className="field" maxLength={500} placeholder="Conditions particulières…" />
      </label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <SubmitButton />
        {state.message ? (
          <p role="status" className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
