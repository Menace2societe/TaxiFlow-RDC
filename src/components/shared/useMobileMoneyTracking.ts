"use client";

import { useEffect, useState } from "react";
import type { MobileMoneyStatus } from "@/lib/supabase/types";

export type TrackedPayment = {
  ok: boolean;
  message: string;
  transactionId?: string;
  status?: MobileMoneyStatus;
};

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Après l'envoi de la demande, interroge le serveur toutes les 5 s pendant que
 * l'utilisateur tape son code PIN, jusqu'à la réponse de l'opérateur (3 min max).
 */
export function useMobileMoneyTracking(
  started: TrackedPayment,
  refresh: (transactionId: string) => Promise<TrackedPayment>
): TrackedPayment {
  const [tracked, setTracked] = useState<TrackedPayment | null>(null);

  useEffect(() => {
    if (started.status !== "accepted" || !started.transactionId) return;
    const transactionId = started.transactionId;
    setTracked(started);

    const startedAt = Date.now();
    const timer = setInterval(async () => {
      const next = await refresh(transactionId);
      const timedOut = Date.now() - startedAt > POLL_TIMEOUT_MS;
      if (next.status !== "accepted" || timedOut) {
        clearInterval(timer);
        setTracked(
          next.status === "accepted"
            ? { ...next, message: "Pas encore de réponse de l'opérateur. Le paiement sera pris en compte dès sa confirmation." }
            : next
        );
      } else {
        setTracked(next);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [started, refresh]);

  return tracked && tracked.transactionId === started.transactionId ? tracked : started;
}
