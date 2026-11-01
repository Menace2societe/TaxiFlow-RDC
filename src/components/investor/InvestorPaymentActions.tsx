"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { approvePayment, rejectPayment } from "@/actions/payments";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type InvestorPaymentActionsProps = {
  paymentId: string;
};

type FeedbackState = { ok: boolean; message: string } | null;

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Boutons Valider / Rejeter pour l'investisseur.
 * Chaque action utilise `useTransition` pour un état de chargement local
 * sans bloquer le reste de l'interface. Un seul bouton peut être actif à la fois.
 *
 * Après une action réussie, router.refresh() re-synchronise les Server Components.
 */
export function InvestorPaymentActions({ paymentId }: InvestorPaymentActionsProps) {
  const router = useRouter();
  const [isPendingApprove, startApprove] = useTransition();
  const [isPendingReject, startReject] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const isBusy = isPendingApprove || isPendingReject;

  function handleApprove() {
    setFeedback(null);
    startApprove(async () => {
      const result = await approvePayment(paymentId);
      setFeedback(result);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  function handleReject() {
    setFeedback(null);
    startReject(async () => {
      const result = await rejectPayment(paymentId);
      setFeedback(result);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Bouton Valider */}
        <button
          id={`approve-payment-${paymentId}`}
          type="button"
          onClick={handleApprove}
          disabled={isBusy}
          aria-label="Valider ce versement"
          title="Valider"
          className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border-2 border-plate-ink bg-plate-white px-4 text-[15px] font-bold text-plate-ink transition-colors hover:bg-plate-ground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPendingApprove ? (
            <Loader2 size={18} className="animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 size={18} aria-hidden />
          )}
          {isPendingApprove ? "Validation…" : "Valider"}
        </button>

        {/* Bouton Rejeter */}
        <button
          id={`reject-payment-${paymentId}`}
          type="button"
          onClick={handleReject}
          disabled={isBusy}
          aria-label="Rejeter ce versement"
          title="Rejeter"
          className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border-2 border-plate-bad bg-plate-white px-4 text-[15px] font-bold text-plate-bad transition-colors hover:bg-plate-bad hover:text-plate-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPendingReject ? (
            <Loader2 size={18} className="animate-spin" aria-hidden />
          ) : (
            <XCircle size={18} aria-hidden />
          )}
          {isPendingReject ? "Rejet…" : "Rejeter"}
        </button>
      </div>

      {/* Retour en ligne */}
      {feedback && (
        <span
          role={feedback.ok ? "status" : "alert"}
          className={`flex items-center gap-1.5 text-[15px] font-semibold ${
            feedback.ok ? "text-plate-ok" : "text-plate-bad"
          }`}
        >
          {feedback.ok ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
          {feedback.message}
        </span>
      )}
    </div>
  );
}
