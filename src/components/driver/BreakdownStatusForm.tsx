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
    label: "Démarrer la réparation",
    pendingLabel: "Démarrage…",
    icon: Wrench,
    btnClass: "btn-secondary w-full px-4 sm:w-auto"
  },
  in_progress: {
    next: "resolved",
    label: "Réparation terminée",
    pendingLabel: "Enregistrement…",
    icon: CheckCircle2,
    btnClass: "btn-secondary w-full px-4 sm:w-auto"
  },
  resolved: null
};

const initialState: BreakdownActionState = { ok: false, message: "" };

function SubmitButton({ transition }: { transition: Transition }) {
  const { pending } = useFormStatus();
  const Icon = transition.icon;

  return (
    <button type="submit" disabled={pending} className={transition.btnClass}>
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Icon size={18} aria-hidden />}
      <span className="whitespace-normal leading-tight">{pending ? transition.pendingLabel : transition.label}</span>
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
    <div className="grid gap-2">
      <form action={submitAction}>
        <input type="hidden" name="breakdown_id" value={breakdownId} />
        <input type="hidden" name="new_status" value={transition.next} />
        <SubmitButton transition={transition} />
      </form>

      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`rounded-lg border-2 bg-plate-white px-4 py-3 text-[15px] font-semibold ${
            state.ok ? "border-plate-ok text-plate-ok" : "border-plate-bad text-plate-bad"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
