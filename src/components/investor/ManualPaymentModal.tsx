"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Banknote, CheckCircle2, Loader2, PlusCircle, X, XCircle } from "lucide-react";
import { recordManualPayment } from "@/actions/payments";
import { StateMark } from "@/components/driver/plate";
import type { FleetDriver } from "@/lib/dashboard/data";
import { useRouter } from "next/navigation";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

// ─── Types ────────────────────────────────────────────────────────────────────

type ManualPaymentModalProps = {
  /** Liste des chauffeurs de la flotte investisseur, pour le dropdown. */
  drivers: FleetDriver[];
};

type ToastState = { ok: boolean; message: string } | null;

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Bouton + modal permettant à l'investisseur de saisir un versement manuel.
 * Gère l'état d'ouverture, la soumission avec `useTransition`, et le toast de succès.
 * Fermeture sur Escape ou clic sur l'overlay.
 */
export function ManualPaymentModal({ drivers }: ManualPaymentModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Valeurs du formulaire
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [notes, setNotes] = useState("");

  // Fermeture sur Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    if (isOpen) {
      document.addEventListener("keydown", onKey);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Auto-dismiss toast succès après 3s
  useEffect(() => {
    if (toast?.ok) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function todayStr() {
    return todayInAppTimezone();
  }

  function openModal() {
    setToast(null);
    setAmount("");
    setNotes("");
    setPaymentDate(todayStr());
    setDriverId(drivers[0]?.id ?? "");
    setIsOpen(true);
  }

  function closeModal() {
    if (isPending) return;
    setIsOpen(false);
    setToast(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverId || !amount || !paymentDate) return;

    startTransition(async () => {
      const result = await recordManualPayment({
        driverId,
        amount: Number(amount),
        paymentDate,
        notes: notes.trim() || undefined
      });

      setToast(result);

      if (result.ok) {
        router.refresh();
        // Fermer le modal après un court délai pour que l'utilisateur voit le toast
        setTimeout(() => {
          setIsOpen(false);
          setToast(null);
        }, 1400);
      }
    });
  }

  return (
    <>
      {/* ─── Bouton déclencheur ─────────────────────────────────────────────────── */}
      <button id="open-manual-payment-modal" type="button" onClick={openModal} className="btn-primary px-5">
        <PlusCircle size={18} aria-hidden />
        Saisir un versement manuel
      </button>

      {/* ─── Fond + fenêtre ─────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-payment-title"
        >
          {/* Fond */}
          <div className="absolute inset-0 bg-plate-ink/40" onClick={closeModal} aria-hidden />

          {/* Fenêtre */}
          <div
            ref={dialogRef}
            className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border-2 border-plate-ink bg-plate-white text-plate-ink"
          >
            {/* En-tête */}
            <div className="flex items-start justify-between gap-3 border-b-2 border-plate-rule px-5 py-4">
              <div>
                <h2 id="manual-payment-title" className="font-plate text-[24px] font-bold leading-tight">
                  Versement manuel
                </h2>
                <p className="mt-0.5 flex items-center gap-2 text-[15px]">
                  <StateMark state="ok" />
                  Validé dès l&apos;enregistrement
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                aria-label="Fermer"
                className="-mr-2 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg hover:bg-plate-ground disabled:opacity-40"
              >
                <X size={22} aria-hidden />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="grid gap-4 px-5 py-5">
              {/* Chauffeur */}
              <div>
                <label htmlFor="manual-driver" className="mb-1.5 block text-[15px] font-semibold">
                  Chauffeur
                </label>
                {drivers.length === 0 ? (
                  <p className="rounded-lg border-2 border-dashed border-plate-ink px-3 py-3 text-[15px]">
                    Aucun chauffeur assigné dans votre flotte
                  </p>
                ) : (
                  <select
                    id="manual-driver"
                    className="field"
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    required
                    disabled={isPending}
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name ?? `Chauffeur ${d.id.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Montant */}
              <div>
                <label htmlFor="manual-amount" className="mb-1.5 block text-[15px] font-semibold">
                  Montant (FC)
                </label>
                <input
                  id="manual-amount"
                  className="field"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="decimal"
                  placeholder="Ex. : 15 000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              {/* Date */}
              <div>
                <label htmlFor="manual-date" className="mb-1.5 block text-[15px] font-semibold">
                  Date du versement
                </label>
                <input
                  id="manual-date"
                  className="field"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={todayStr()}
                  required
                  disabled={isPending}
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="manual-notes" className="mb-1.5 block text-[15px] font-semibold">
                  Commentaire (facultatif)
                </label>
                <textarea
                  id="manual-notes"
                  className="field min-h-[88px] resize-none py-2.5"
                  placeholder="Ex. : paiement en espèces remis en main propre…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  disabled={isPending}
                />
              </div>

              {/* Retour */}
              {toast && (
                <p
                  role={toast.ok ? "status" : "alert"}
                  className={`flex items-start gap-2 rounded-lg border-2 bg-plate-white px-3 py-2.5 text-[15px] font-semibold ${
                    toast.ok ? "border-plate-ok text-plate-ok" : "border-plate-bad text-plate-bad"
                  }`}
                >
                  {toast.ok ? (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
                  ) : (
                    <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
                  )}
                  {toast.message}
                </p>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={closeModal} disabled={isPending} className="btn-secondary w-full px-3">
                  Annuler
                </button>
                <button
                  id="submit-manual-payment"
                  type="submit"
                  disabled={isPending || drivers.length === 0 || !amount}
                  className="btn-primary w-full px-3"
                >
                  {isPending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Banknote size={18} aria-hidden />}
                  {isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
