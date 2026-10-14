import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { TrackedPayment } from "./useMobileMoneyTracking";

/** État d'un paiement Mobile Money : en attente du PIN, reçu ou échoué. */
export function PaymentStatusNotice({ payment }: { payment: TrackedPayment }) {
  if (!payment.message) return null;

  const tone =
    payment.status === "completed"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : payment.status === "accepted"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-200"
        : "bg-red-500/10 text-red-700 dark:text-red-300";

  return (
    <p role="status" className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${tone}`}>
      {payment.status === "completed" ? (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />
      ) : payment.status === "accepted" ? (
        <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
      )}
      <span>{payment.message}</span>
    </p>
  );
}
