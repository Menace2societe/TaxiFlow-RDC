"use client";

import { useState, useTransition } from "react";
import { startRepair, completeRepair } from "@/actions/breakdowns";

interface MaintenanceActionButtonsProps {
  breakdownId: string;
  /**
   * Statuts réels du schéma BDD :
   *   'open'        → panne signalée, en attente de réparation
   *   'in_progress' → réparation en cours
   *   'resolved'    → réparation terminée, véhicule en service
   */
  currentStatus: "open" | "in_progress" | "resolved" | string;
}

export function MaintenanceActionButtons({
  breakdownId,
  currentStatus
}: MaintenanceActionButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Démarrer la réparation (open → in_progress) ──────────────────────────────
  const handleStart = () => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await startRepair(breakdownId);
        if (res.ok) {
          setShowConfirmStart(false);
        } else {
          setErrorMessage(res.message ?? "Une erreur est survenue.");
        }
      } catch {
        setErrorMessage("Erreur de connexion.");
      }
    });
  };

  // ── Terminer la réparation (in_progress → resolved) ──────────────────────────
  const handleComplete = () => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await completeRepair(breakdownId);
        if (res.ok) {
          setShowConfirmComplete(false);
          setNotes("");
        } else {
          setErrorMessage(res.message ?? "Une erreur est survenue.");
        }
      } catch {
        setErrorMessage("Erreur de connexion.");
      }
    });
  };

  // ── Statut terminal : badge discret ──────────────────────────────────────────
  if (currentStatus === "resolved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
        🟢 Réparé &amp; En service
      </span>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-2">

      {/* ── Bouton principal : démarrer (open) ───────────────────────────────── */}
      {currentStatus === "open" && !showConfirmStart && (
        <button
          type="button"
          onClick={() => setShowConfirmStart(true)}
          disabled={isPending}
          className="w-full rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ⚙️ Démarrer la réparation
        </button>
      )}

      {/* ── Confirmation inline : démarrer ──────────────────────────────────── */}
      {currentStatus === "open" && showConfirmStart && (
        <div className="animate-fadeIn rounded-lg border border-amber-500/30 bg-slate-800 p-3">
          <p className="mb-2 text-xs text-amber-300">
            {isPending ? "Démarrage en cours…" : "Confirmer le démarrage de la réparation ?"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleStart}
              disabled={isPending}
              className="rounded px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
            >
              {isPending ? "…" : "Oui, démarrer"}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmStart(false)}
              disabled={isPending}
              className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-600"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Bouton principal : remettre en service (in_progress) ─────────────── */}
      {currentStatus === "in_progress" && !showConfirmComplete && (
        <button
          type="button"
          onClick={() => setShowConfirmComplete(true)}
          disabled={isPending}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          ✅ Remettre en service
        </button>
      )}

      {/* ── Confirmation inline : terminer avec notes ────────────────────────── */}
      {currentStatus === "in_progress" && showConfirmComplete && (
        <div className="animate-fadeIn flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-slate-800 p-3">
          <input
            type="text"
            placeholder="Notes de réparation (optionnel)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleComplete}
              disabled={isPending}
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isPending ? "Validation…" : "Valider"}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmComplete(false)}
              disabled={isPending}
              className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-600"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Message d'erreur inline ──────────────────────────────────────────── */}
      {errorMessage && (
        <p role="alert" className="text-center text-[10px] text-rose-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
