"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Banknote,
  CheckCircle2,
  Loader2,
  PlusCircle,
  User,
  X,
  XCircle,
  Calendar,
  FileText
} from "lucide-react";
import { recordManualPayment } from "@/actions/payments";
import type { FleetDriver } from "@/lib/dashboard/data";
import { useRouter } from "next/navigation";

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
    return new Date().toISOString().slice(0, 10);
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
      <button
        id="open-manual-payment-modal"
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      >
        <PlusCircle size={15} aria-hidden />
        Saisir un versement manuel
      </button>

      {/* ─── Overlay + Modal ────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Saisir un versement manuel"
        >
          {/* Fond sombre */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden
          />

          {/* Boîte du modal */}
          <div
            ref={dialogRef}
            className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl animate-fade-in-up"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Banknote className="text-emerald-400" size={18} aria-hidden />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Versement manuel</h2>
                  <p className="text-xs text-neutral-500">Statut : approuvé immédiatement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                aria-label="Fermer"
                className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corps du formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {/* Chauffeur */}
              <div>
                <label
                  htmlFor="manual-driver"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400"
                >
                  <User size={11} />
                  Chauffeur
                </label>
                {drivers.length === 0 ? (
                  <p className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2.5 text-sm text-neutral-500">
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
                <label
                  htmlFor="manual-amount"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400"
                >
                  <Banknote size={11} />
                  Montant (CDF)
                </label>
                <input
                  id="manual-amount"
                  className="field"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="decimal"
                  placeholder="Ex : 15 000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="manual-date"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400"
                >
                  <Calendar size={11} />
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
                <label
                  htmlFor="manual-notes"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-400"
                >
                  <FileText size={11} />
                  Notes / Commentaire
                  <span className="text-neutral-600">(optionnel)</span>
                </label>
                <textarea
                  id="manual-notes"
                  className="field min-h-[72px] resize-none"
                  placeholder="Ex : paiement en espèces remis en main propre..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  disabled={isPending}
                />
              </div>

              {/* Toast feedback */}
              {toast && (
                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                    toast.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {toast.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  {toast.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button
                  id="submit-manual-payment"
                  type="submit"
                  disabled={isPending || drivers.length === 0 || !amount}
                  className="btn-primary flex-1"
                >
                  {isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Banknote size={15} />
                  )}
                  {isPending ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
