"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { reviewEntry, type ReviewEntryState } from "@/actions/control";

const initialState: ReviewEntryState = { ok: false, message: "" };

function DecisionButton({ value, label, className }: { value: "justified" | "fraud"; label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="decision"
      value={value}
      disabled={pending}
      className={`inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border-2 px-4 text-[15px] font-bold transition-colors disabled:opacity-50 ${className}`}
    >
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
      {label}
    </button>
  );
}

export function ReviewEntryForm({ entryId }: { entryId: string }) {
  const [state, formAction] = useFormState(reviewEntry, initialState);

  if (state.ok) {
    return (
      <p role="status" className="flex items-start gap-2 text-[15px] font-semibold text-plate-ok">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="entry_id" value={entryId} />
      <label className="block text-[15px] font-semibold" htmlFor={`note-${entryId}`}>
        Votre note (facultatif)
      </label>
      <input
        id={`note-${entryId}`}
        name="note"
        className="field"
        placeholder="Ex. : bouchons à Limete, longue course…"
        maxLength={500}
      />
      <div className="grid grid-cols-2 gap-2">
        <DecisionButton
          value="justified"
          label="Justifiée"
          className="border-plate-ink bg-plate-white text-plate-ink hover:bg-plate-ground"
        />
        <DecisionButton
          value="fraud"
          label="Fraude"
          className="border-plate-bad bg-plate-white text-plate-bad hover:bg-plate-bad hover:text-plate-white"
        />
      </div>
      {state.message ? (
        <p role="alert" className="flex items-start gap-2 text-[15px] font-semibold text-plate-bad">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
