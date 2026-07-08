"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Wrench } from "lucide-react";
import {
  updateBreakdownStatus,
  type BreakdownActionState
} from "@/actions/breakdowns";
import type { BreakdownStatus } from "@/lib/supabase/types";

// ─── Table de transitions de statut ───────────────────────────────────────────

type Transition = {
  next: BreakdownStatus;
  label: string;
  pendingLabel: string;
  icon: typeof Wrench;
  btnClass: string;
};

const statusTransitions: Record<BreakdownStatus, Transition[]> = {
  // Panne signalée → Démarrer la réparation
  open: [
    {
      next: "in_progress",
      label: "Démarrer la réparation",
      pendingLabel: "Démarrage…",
      icon: Wrench,
      btnClass:
        "inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-500/20 disabled:opacity-50"
    }
  ],
  // En réparation → Confirmer que la réparation est terminée
  in_progress: [
    {
      next: "resolved",
      label: "Terminer la réparation",
      pendingLabel: "Finalisation…",
      icon: CheckCircle2,
      btnClass:
        "inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
    }
  ],
  // Résolue → pas d'action possible (cycle terminé)
  resolved: []
};

const initialState: BreakdownActionState = { ok: false, message: "" };

// ─── Bouton de soumission ──────────────────────────────────────────────────────

function SubmitBtn({ transition }: { transition: Transition }) {
  const { pending } = useFormStatus();
  const Icon = transition.icon;
  return (
    <button type="submit" disabled={pending} className={transition.btnClass}>
      {pending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Icon size={12} />
      )}
      {pending ? transition.pendingLabel : transition.label}
    </button>
  );
}

// ─── Composant public ──────────────────────────────────────────────────────────

/**
 * Affiche les boutons de transition de statut d'une panne.
 * Cycle : open → in_progress → resolved
 *
 * Après chaque action réussie, router.refresh() est appelé pour forcer
 * Next.js à re-fetcher le RSC payload et mettre à jour les props (badge,
 * compteurs KPI, bouton suivant) sans rechargement complet de la page.
 */
export function BreakdownStatusForm({
  breakdownId,
  currentStatus
}: {
  breakdownId: string;
  currentStatus: BreakdownStatus;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateBreakdownStatus, initialState);
  const transitions = statusTransitions[currentStatus] ?? [];

  // Déclenche un refresh RSC dès que l'action serveur retourne ok: true.
  // Cela force Next.js à re-lire les données fraîches (nouveau statut,
  // nouveaux compteurs KPI) et à re-passer les props mises à jour au
  // composant, sans rechargement complet de la page.
  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, state.message, router]);

  if (transitions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {transitions.map((t) => (
        <form key={t.next} action={formAction}>
          <input type="hidden" name="breakdown_id" value={breakdownId} />
          <input type="hidden" name="new_status" value={t.next} />
          <SubmitBtn transition={t} />
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
