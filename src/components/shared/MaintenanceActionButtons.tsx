"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
      <span className="text-[10px] text-rose-400">
        ⚠ ID de panne manquant
      </span>
    );
  }

  // ── Statut terminal ───────────────────────────────────────────────────────────
  if (currentStatus === "resolved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
        🟢 Réparé &amp; En service
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
              className="w-full rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              ⚙️ Démarrer la réparation
            </button>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-slate-800 p-3">
              <p className="mb-2 text-xs text-amber-300 font-medium">
                Confirmer le démarrage de la réparation ?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 size={10} className="animate-spin" />}
                  {isPending ? "Démarrage…" : "Oui, démarrer"}
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
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              ✅ Remettre en service
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-slate-800 p-3">
              <input
                type="text"
                placeholder="Notes de réparation (optionnel)…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 size={10} className="animate-spin" />}
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
