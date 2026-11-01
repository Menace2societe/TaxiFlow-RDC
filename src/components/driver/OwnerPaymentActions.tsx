"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
      {pending && <Loader2 size={16} className="shrink-0 animate-spin" aria-hidden />}
      {pending ? pendingLabel : label}
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

const initialState: UpdatePaymentStatusState = { ok: false, message: "" };

/**
 * Boutons Valider / Rejeter pour le chauffeur-patron.
 * Chaque bouton soumet son propre <form> indépendant.
 * N'est rendu que si currentStatus !== le statut cible.
 *
 * Après chaque action réussie, router.refresh() force le rechargement
 * des Server Components (liste de versements) sans reload complet de la page.
 */
export function OwnerPaymentActions({
  paymentId,
  currentStatus
}: {
  paymentId: string;
  currentStatus: PaymentStatus;
}) {
  const router = useRouter();
  const [approveState, approveAction] = useFormState(updatePaymentStatus, initialState);
  const [rejectState, rejectAction] = useFormState(updatePaymentStatus, initialState);

  const showApprove = currentStatus !== "approved";
  const showReject = currentStatus !== "rejected";

  // Feedback visible si une action vient d'être effectuée
  const feedback = approveState.message || rejectState.message;
  const isOk = approveState.ok || rejectState.ok;

  // Refs pour éviter les doubles refreshes sur le même message de succès
  const lastApproveMsg = useRef<string>("");
  const lastRejectMsg = useRef<string>("");

  useEffect(() => {
    if (
      approveState.ok &&
      approveState.message &&
      approveState.message !== lastApproveMsg.current
    ) {
      lastApproveMsg.current = approveState.message;
      router.refresh();
    }
  }, [approveState.ok, approveState.message, router]);

  useEffect(() => {
    if (
      rejectState.ok &&
      rejectState.message &&
      rejectState.message !== lastRejectMsg.current
    ) {
      lastRejectMsg.current = rejectState.message;
      router.refresh();
    }
  }, [rejectState.ok, rejectState.message, router]);

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {showApprove && (
          <form action={approveAction}>
            <input type="hidden" name="payment_id" value={paymentId} />
            <input type="hidden" name="new_status" value="approved" />
            <SubmitBtn
              label="Valider"
              pendingLabel="Envoi…"
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border-2 border-plate-ink bg-plate-white px-4 text-[15px] font-bold text-plate-ink transition-colors hover:bg-plate-ground disabled:opacity-50"
            />
          </form>
        )}
        {showReject && (
          <form action={rejectAction}>
            <input type="hidden" name="payment_id" value={paymentId} />
            <input type="hidden" name="new_status" value="rejected" />
            <SubmitBtn
              label="Rejeter"
              pendingLabel="Envoi…"
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border-2 border-plate-bad bg-plate-white px-4 text-[15px] font-bold text-plate-bad transition-colors hover:bg-plate-ground disabled:opacity-50"
            />
          </form>
        )}
      </div>

      {feedback && (
        <span
          role={isOk ? "status" : "alert"}
          className={`flex items-center gap-1.5 text-[15px] font-semibold ${isOk ? "text-plate-ok" : "text-plate-bad"}`}
        >
          {isOk ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
          {feedback}
        </span>
      )}
    </div>
  );
}
