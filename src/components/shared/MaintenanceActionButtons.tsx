"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, PlayCircle, RotateCcw, Wrench } from "lucide-react";
import { startRepair, completeRepair } from "@/actions/breakdowns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceActionButtonsProps {
  breakdownId: string;
  /**
   * Statuts réels du schéma BDD :
   *   'open'        → panne signalée, en attente de réparation
   *   'in_progress' → réparation en cours
   *   'resolved'    → réparation terminée, véhicule remis en service
   */
  currentStatus: "open" | "in_progress" | "resolved" | string;
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Boutons d'action contextuels avec confirmation inline et affichage
 * de l'erreur exacte (pas de alert() / confirm()).
 *
 * Après chaque mutation réussie, router.refresh() force le rechargement
 * des Server Components parents sans recharger toute la page.
 */
export function MaintenanceActionButtons({
  breakdownId,
  currentStatus
}: MaintenanceActionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Guard : breakdownId obligatoire ──────────────────────────────────────────
  if (!breakdownId) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-red-300">
        <AlertTriangle size={11} aria-hidden />
        ID de panne manquant
      </span>
    );
  }

  // ── Statut terminal ───────────────────────────────────────────────────────────
  if (currentStatus === "resolved") {
    return (
      <span className="badge badge-green">
        <CheckCircle2 size={12} aria-hidden />
        Réparé &amp; en service
      </span>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleStart() {
    setErrorMessage(null);
    startTransition(async () => {
      let res: { ok: boolean; message: string } | undefined;
      try {
        res = await startRepair(breakdownId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Exception : ${msg}`);
        return;
      }
      if (res.ok) {
        setShowConfirmStart(false);
        router.refresh();
      } else {
        setErrorMessage(`Erreur serveur : ${res.message}`);
      }
    });
  }

  function handleComplete() {
    setErrorMessage(null);
    startTransition(async () => {
      let res: { ok: boolean; message: string } | undefined;
      try {
        res = await completeRepair(breakdownId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Exception : ${msg}`);
        return;
      }
      if (res.ok) {
        setShowConfirmComplete(false);
        setNotes("");
        router.refresh();
      } else {
        setErrorMessage(`Erreur serveur : ${res.message}`);
      }
    });
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex w-full max-w-xs flex-col gap-2">

      {/* ── open : bouton + confirmation inline ──────────────────────────────── */}
      {currentStatus === "open" && (
        <>
          {!showConfirmStart ? (
            <button
              type="button"
              onClick={() => { setErrorMessage(null); setShowConfirmStart(true); }}
              disabled={isPending}
              className="btn-warning min-h-10 w-full px-3 text-xs"
            >
              <Wrench size={14} aria-hidden />
              Démarrer la réparation
            </button>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-neutral-900/90 p-3">
              <p className="mb-2 text-xs font-medium text-amber-300">
                Confirmer le démarrage de la réparation ?
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isPending}
                  className="btn-warning min-h-9 px-3 text-xs"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
                  {isPending ? "Démarrage…" : "Oui, démarrer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmStart(false)}
                  disabled={isPending}
                  className="btn-secondary min-h-9 px-3 text-xs"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── in_progress : bouton + confirmation avec notes ───────────────────── */}
      {currentStatus === "in_progress" && (
        <>
          {!showConfirmComplete ? (
            <button
              type="button"
              onClick={() => { setErrorMessage(null); setShowConfirmComplete(true); }}
              disabled={isPending}
              className="btn-primary min-h-10 w-full px-3 text-xs"
            >
              <RotateCcw size={14} aria-hidden />
              Remettre en service
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-neutral-900/90 p-3">
              <input
                type="text"
                placeholder="Notes de réparation (optionnel)…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                className="field min-h-9 px-3 py-2 text-xs"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isPending}
                  className="btn-primary min-h-9 px-3 text-xs"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  {isPending ? "Validation…" : "Valider"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmComplete(false)}
                  disabled={isPending}
                  className="btn-secondary min-h-9 px-3 text-xs"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Erreur exacte affichée en rouge ──────────────────────────────────── */}
      {errorMessage && (
        <p
          role="alert"
          className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-1.5 text-[10px] leading-snug text-rose-400"
        >
          {errorMessage}
        </p>
      )}

      {/* ── Info de débogage masquée en prod ─────────────────────────────────── */}
      {process.env.NODE_ENV !== "production" && (
        <p className="text-[9px] text-slate-600">
          id: {breakdownId} · statut: {currentStatus}
        </p>
      )}
    </div>
  );
}
