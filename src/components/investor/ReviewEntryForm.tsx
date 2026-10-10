"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { reviewEntry, type ReviewEntryState } from "@/actions/control";

const initialState: ReviewEntryState = { ok: false, message: "" };

function DecisionButton({ value, label, tone }: { value: "justified" | "fraud"; label: string; tone: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="decision"
      value={value}
      disabled={pending}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold disabled:opacity-50 ${tone}`}
    >
      {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
      {label}
    </button>
  );
}

export function ReviewEntryForm({ entryId }: { entryId: string }) {
  const [state, formAction] = useFormState(reviewEntry, initialState);

  if (state.ok) {
    return <p className="text-sm font-semibold text-emerald-300">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="entry_id" value={entryId} />
      <label className="sr-only" htmlFor={`note-${entryId}`}>
        Note
      </label>
      <input
        id={`note-${entryId}`}
        name="note"
        className="field min-h-10 text-sm"
        placeholder="Note (ex. bouchons à Limete, client longue course…)"
        maxLength={500}
      />
      <div className="flex flex-wrap gap-2">
        <DecisionButton value="justified" label="Justifiée" tone="border-emerald-500/40 bg-emerald-500/10 text-emerald-300" />
        <DecisionButton value="fraud" label="Fraude" tone="border-red-500/40 bg-red-500/10 text-red-300" />
      </div>
      {state.message ? <p className="text-xs text-red-300">{state.message}</p> : null}
    </form>
  );
}
