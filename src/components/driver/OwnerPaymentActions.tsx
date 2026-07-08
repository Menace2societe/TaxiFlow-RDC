"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  updatePaymentStatus,
  type UpdatePaymentStatusState
} from "@/actions/payments";
import type { PaymentStatus } from "@/lib/supabase/types";

// ─── Bouton de soumission ──────────────────────────────────────────────────────

function SubmitBtn({
  label,
  pendingLabel,
  className
}: {
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <Loader2 size={11} className="animate-spin shrink-0" />}
      {pending ? pendingLabel : label}
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

const initialState: UpdatePaymentStatusState = { ok: false, message: "" };

/**
 * Boutons Approuver / Rejeter pour le chauffeur-patron.
 * Chaque bouton soumet son propre <form> indépendant.
 * N'est rendu que si currentStatus !== le statut cible.
 */
export function OwnerPaymentActions({
  paymentId,
  currentStatus
}: {
  paymentId: string;
  currentStatus: PaymentStatus;
}) {
  const [approveState, approveAction] = useFormState(updatePaymentStatus, initialState);
  const [rejectState, rejectAction] = useFormState(updatePaymentStatus, initialState);

  const showApprove = currentStatus !== "approved";
  const showReject = currentStatus !== "rejected";

  // Feedback visible si une action vient d'être effectuée
  const feedback = approveState.message || rejectState.message;
  const isOk = approveState.ok || rejectState.ok;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        {showApprove && (
          <form action={approveAction}>
            <input type="hidden" name="payment_id" value={paymentId} />
            <input type="hidden" name="new_status" value="approved" />
            <SubmitBtn
              label="Approuver"
              pendingLabel="..."
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
            />
          </form>
        )}
        {showReject && (
          <form action={rejectAction}>
            <input type="hidden" name="payment_id" value={paymentId} />
            <input type="hidden" name="new_status" value="rejected" />
            <SubmitBtn
              label="Rejeter"
              pendingLabel="..."
              className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-300 transition-all hover:bg-red-500/20 disabled:opacity-50"
            />
          </form>
        )}
      </div>

      {feedback && (
        <span
          className={`flex items-center gap-1 text-[10px] font-medium ${
            isOk ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isOk ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
          {feedback}
        </span>
      )}
    </div>
  );
}
