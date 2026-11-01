"use client";

import { Loader2, Wrench } from "lucide-react";
import { useFormStatus } from "react-dom";
import { reportBreakdown } from "@/actions/breakdowns";

// value = ce qui est enregistré (inchangé), label = ce qu'on lit.
const PANNE_TYPES = [
  { value: "Moteur", label: "Moteur" },
  { value: "Pneu", label: "Pneu" },
  { value: "Accident", label: "Accident" },
  { value: "Freinage", label: "Freins" },
  { value: "Electricite", label: "Électricité" },
  { value: "Autre", label: "Autre" }
] as const;

function SubmitPanne({ hasVehicle }: { hasVehicle: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-warning w-full" disabled={pending || !hasVehicle}>
      {pending ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Wrench size={18} aria-hidden />}
      {pending ? "Envoi…" : "Signaler la panne"}
    </button>
  );
}

export function DriverBreakdownQuickForm({ hasVehicle }: { hasVehicle: boolean }) {
  return (
    <form action={reportBreakdown} className="grid gap-4">
      <label className="block text-[15px] font-semibold">
        Type de panne
        <select className="field mt-1.5" name="type" required disabled={!hasVehicle} defaultValue="">
          <option value="" disabled>
            Choisir…
          </option>
          {PANNE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[15px] font-semibold">
        Ce qui s&apos;est passé
        <input className="field mt-1.5" name="description" maxLength={500} placeholder="Ex. : crevaison roue arrière gauche" />
      </label>
      <label className="block text-[15px] font-semibold">
        Coût estimé en FC (si vous le savez)
        <input
          className="field mt-1.5"
          name="estimated_cost"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          defaultValue={0}
        />
      </label>
      <SubmitPanne hasVehicle={hasVehicle} />
    </form>
  );
}
