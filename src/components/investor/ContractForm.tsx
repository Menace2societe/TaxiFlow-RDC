"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, FileSignature, Loader2 } from "lucide-react";
import { createContract, type ContractActionState } from "@/actions/contracts";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

const initialState: ContractActionState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full px-6 sm:w-auto" disabled={pending}>
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <FileSignature size={18} aria-hidden />}
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
      <label className="grid gap-1.5 text-[15px] font-semibold">
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
      <label className="grid gap-1.5 text-[15px] font-semibold">
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
        <legend className="text-[15px] font-semibold">Type de contrat</legend>
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
              <span className="block min-h-[52px] rounded-xl border-2 border-plate-ink/70 bg-plate-white p-3 hover:border-plate-ink peer-checked:border-plate-ink peer-checked:bg-plate-ink peer-checked:text-plate-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-plate-band">
                <span className="block text-[16px] font-bold">{label}</span>
                <span className="mt-0.5 block text-[15px]">{help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {type === "location_vente" ? (
        <label className="grid gap-1.5 text-[15px] font-semibold">
          Prix total du véhicule (CDF)
          <input name="possession_total_cdf" type="number" min="1" step="1" className="field" required />
        </label>
      ) : null}
      <label className="grid gap-1.5 text-[15px] font-semibold">
        Versement journalier attendu (CDF)
        <input name="daily_amount_cdf" type="number" min="0" step="1" className="field" />
      </label>
      <label className="grid gap-1.5 text-[15px] font-semibold">
        Début du contrat
        <input name="started_at" type="date" className="field" defaultValue={todayInAppTimezone()} required />
      </label>
      <label className="grid gap-1.5 text-[15px] font-semibold">
        Note
        <input name="notes" className="field" maxLength={500} placeholder="Ex. : conditions particulières" />
      </label>
      <div className="grid gap-3 md:col-span-2">
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
            {state.message}
          </p>
        ) : null}
        <div>
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
