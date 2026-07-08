"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, RefreshCw } from "lucide-react";
import {
  updateBreakdownStatus,
  type BreakdownActionState
} from "@/actions/breakdowns";
import type { BreakdownStatus } from "@/lib/supabase/types";

const statusTransitions: Record<
  BreakdownStatus,
  { next: BreakdownStatus; label: string; btnClass: string }[]
> = {
  open: [
    {
      next: "in_progress",
      label: "Démarrer réparation",
      btnClass:
        "inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-500/20 disabled:opacity-50"
    }
  ],
  in_progress: [
    {
      next: "resolved",
      label: "Marquer résolue",
      btnClass:
        "inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
    }
  ],
  resolved: []
};

const initialState: BreakdownActionState = { ok: false, message: "" };

function SubmitBtn({ label, btnClass }: { label: string; btnClass: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnClass}>
      {pending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <RefreshCw size={12} />
      )}
      {pending ? "Mise à jour…" : label}
    </button>
  );
}

/**
 * Affiche les boutons de transition de statut d'une panne.
 * Chaque bouton soumet un formulaire avec breakdown_id + new_status.
 */
export function BreakdownStatusForm({
  breakdownId,
  currentStatus
}: {
  breakdownId: string;
  currentStatus: BreakdownStatus;
}) {
  const [state, formAction] = useFormState(updateBreakdownStatus, initialState);
  const transitions = statusTransitions[currentStatus] ?? [];

  if (transitions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {transitions.map((t) => (
        <form key={t.next} action={formAction}>
          <input type="hidden" name="breakdown_id" value={breakdownId} />
          <input type="hidden" name="new_status" value={t.next} />
          <SubmitBtn label={t.label} btnClass={t.btnClass} />
        </form>
      ))}
      {state.message && (
        <p
          className={`text-[11px] font-medium ${
            state.ok ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
