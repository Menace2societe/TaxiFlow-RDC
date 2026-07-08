"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Wrench } from "lucide-react";
import {
  updateBreakdownStatus,
  type BreakdownActionState
} from "@/actions/breakdowns";
import type { BreakdownStatus } from "@/lib/supabase/types";

type Transition = {
  next: BreakdownStatus;
  label: string;
  pendingLabel: string;
  icon: typeof Wrench;
  btnClass: string;
};

const statusTransitions: Record<BreakdownStatus, Transition | null> = {
  open: {
    next: "in_progress",
    label: "Demarrer la reparation",
    pendingLabel: "Demarrage...",
    icon: Wrench,
    btnClass:
      "inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
  },
  in_progress: {
    next: "resolved",
    label: "Terminer la reparation",
    pendingLabel: "Finalisation...",
    icon: CheckCircle2,
    btnClass:
      "inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
  },
  resolved: null
};

const initialState: BreakdownActionState = { ok: false, message: "" };

function SubmitButton({ transition }: { transition: Transition }) {
  const { pending } = useFormStatus();
  const Icon = transition.icon;

  return (
    <button type="submit" disabled={pending} className={transition.btnClass}>
      {pending ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {pending ? transition.pendingLabel : transition.label}
    </button>
  );
}

export function BreakdownStatusForm({
  breakdownId,
  currentStatus
}: {
  breakdownId: string;
  currentStatus: BreakdownStatus;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(updateBreakdownStatus, initialState);
  const [displayStatus, setDisplayStatus] = useState<BreakdownStatus>(currentStatus);
  const pendingStatusRef = useRef<BreakdownStatus | null>(null);
  const handledSuccessRef = useRef("");

  useEffect(() => {
    setDisplayStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    if (!state.ok || !state.message || state.message === handledSuccessRef.current) {
      return;
    }

    handledSuccessRef.current = state.message;

    if (pendingStatusRef.current) {
      setDisplayStatus(pendingStatusRef.current);
      pendingStatusRef.current = null;
    }

    router.refresh();
  }, [router, state.message, state.ok]);

  function submitAction(formData: FormData) {
    const nextStatus = formData.get("new_status");
    pendingStatusRef.current =
      nextStatus === "open" || nextStatus === "in_progress" || nextStatus === "resolved"
        ? nextStatus
        : null;

    formAction(formData);
  }

  const transition = statusTransitions[displayStatus];

  if (!transition) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={submitAction}>
        <input type="hidden" name="breakdown_id" value={breakdownId} />
        <input type="hidden" name="new_status" value={transition.next} />
        <SubmitButton transition={transition} />
      </form>

      {state.message && (
        <p
          className={`text-[11px] font-medium ${
            state.ok ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
