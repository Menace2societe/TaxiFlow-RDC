"use client";

import { useTransition, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Wrench } from "lucide-react";
import { startRepair, completeRepair } from "@/actions/breakdowns";
import type { BreakdownStatus } from "@/lib/supabase/types";

interface MaintenanceActionButtonsProps {
  breakdownId: string;
  /** Statut actuel de la panne : 'open' | 'in_progress' | 'resolved' */
  currentStatus: BreakdownStatus | string;
}

/**
 * Boutons d'action contextuels pour piloter le cycle de vie d'une panne.
 * Partagé entre le portail chauffeur, le dashboard chauffeur et les vues investisseur.
 *
 * - open       → bouton ambre "⚙️ Démarrer la réparation"  (startRepair)
 * - in_progress → bouton vert "✅ Remettre en service"      (completeRepair)
 * - resolved   → badge discret "Réparé & En service"
 *
 * Utilise useTransition pour bloquer les double-clics pendant la mutation
 * et afficher un spinner inline sans bloquer la navigation.
 */
export function MaintenanceActionButtons({
  breakdownId,
  currentStatus
}: MaintenanceActionButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  function handleStart() {
    setFeedback(null);
    startTransition(async () => {
      const res = await startRepair(breakdownId);
      if (!res.ok) {
        setFeedback({ ok: false, message: res.message });
      }
      // En cas de succès, revalidatePath côté serveur rafraîchit la page —
      // pas besoin d'état local supplémentaire.
    });
  }

  function handleComplete() {
    setFeedback(null);
    startTransition(async () => {
      const res = await completeRepair(breakdownId);
      if (!res.ok) {
        setFeedback({ ok: false, message: res.message });
      }
    });
  }

  // ── Statut terminal : badge discret ─────────────────────────────────────────
  if (currentStatus === "resolved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <ShieldCheck size={11} aria-hidden />
        Réparé &amp; En service
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* ── open → in_progress ────────────────────────────────────────────────── */}
      {currentStatus === "open" && (
        <button
          type="button"
          onClick={handleStart}
          disabled={isPending}
          aria-label="Démarrer la réparation"
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 size={11} className="animate-spin" aria-hidden />
          ) : (
            <Wrench size={11} aria-hidden />
          )}
          {isPending ? "Démarrage…" : "⚙️ Démarrer la réparation"}
        </button>
      )}

      {/* ── in_progress → resolved ────────────────────────────────────────────── */}
      {currentStatus === "in_progress" && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={isPending}
          aria-label="Remettre en service"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 size={11} className="animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 size={11} aria-hidden />
          )}
          {isPending ? "Finalisation…" : "✅ Remettre en service"}
        </button>
      )}

      {/* ── Feedback d'erreur inline ─────────────────────────────────────────── */}
      {feedback && !feedback.ok && (
        <p role="alert" className="text-[11px] font-medium text-red-400">
          {feedback.message}
        </p>
      )}
    </div>
  );
}
