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
 * Boutons Approuver ✓ / Rejeter ✗ pour l'investisseur.
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
      <div className="flex items-center gap-1.5">
        {/* Bouton Approuver */}
        <button
          id={`approve-payment-${paymentId}`}
          type="button"
          onClick={handleApprove}
          disabled={isBusy}
          aria-label="Approuver ce versement"
          title="Approuver"
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 transition-all hover:bg-emerald-500/25 hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        >
          {isPendingApprove ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <CheckCircle2 size={11} />
          )}
          {isPendingApprove ? "..." : "Valider"}
        </button>

        {/* Bouton Rejeter */}
        <button
          id={`reject-payment-${paymentId}`}
          type="button"
          onClick={handleReject}
          disabled={isBusy}
          aria-label="Rejeter ce versement"
          title="Rejeter"
          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 transition-all hover:bg-red-500/25 hover:border-red-400/60 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-red-500/50"
        >
          {isPendingReject ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <XCircle size={11} />
          )}
          {isPendingReject ? "..." : "Rejeter"}
        </button>
      </div>

      {/* Feedback inline */}
      {feedback && (
        <span
          className={`flex items-center gap-1 text-[10px] font-medium ${
            feedback.ok ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {feedback.ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
          {feedback.message}
        </span>
      )}
    </div>
  );
}
