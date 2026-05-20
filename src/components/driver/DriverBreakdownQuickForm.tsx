"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { reportBreakdown } from "@/actions/breakdowns";

const PANNE_TYPES = ["Moteur", "Pneu", "Accident", "Freinage", "Electricite", "Autre"] as const;

function SubmitPanne({ hasVehicle }: { hasVehicle: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 text-base font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      disabled={pending || !hasVehicle}
    >
      {pending ? <Loader2 className="animate-spin" size={20} /> : <AlertTriangle size={20} />}
      {pending ? "Envoi..." : "Signaler la panne"}
    </button>
  );
}

export function DriverBreakdownQuickForm({ hasVehicle }: { hasVehicle: boolean }) {
  return (
    <form action={reportBreakdown} className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">
        Type de panne
        <select className="field mt-1 min-h-12 text-base" name="type" required disabled={!hasVehicle}>
          <option value="">Choisir</option>
          {PANNE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">
        Cout estime (CDF, optionnel)
        <input className="field mt-1 min-h-12 text-base" name="estimated_cost" type="number" min="0" step="1" defaultValue={0} />
      </label>
      <label className="block text-sm font-medium text-stone-800 dark:text-stone-200">
        Description courte
        <input className="field mt-1 min-h-12 text-base" name="description" maxLength={500} placeholder="Ex: crevaison roue AR" />
      </label>
      <SubmitPanne hasVehicle={hasVehicle} />
    </form>
  );
}
