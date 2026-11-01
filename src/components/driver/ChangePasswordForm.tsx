"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { changeMyPassword, type ChangePasswordState } from "@/actions/profile";

const initialState: ChangePasswordState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <KeyRound size={18} aria-hidden />}
      {pending ? "Enregistrement…" : "Changer mon code"}
    </button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useFormState(changeMyPassword, initialState);

  return (
    <form action={formAction} className="mt-4 grid gap-4">
      <label className="block text-[15px] font-semibold">
        Nouveau code
        <input className="field mt-1.5" name="password" type="password" minLength={8} autoComplete="new-password" required />
      </label>
      <label className="block text-[15px] font-semibold">
        Le même code, encore une fois
        <input className="field mt-1.5" name="confirm" type="password" minLength={8} autoComplete="new-password" required />
      </label>
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={`flex items-start gap-2 rounded-lg border-2 bg-plate-white px-4 py-3 text-[15px] font-semibold ${
            state.ok ? "border-plate-ok text-plate-ok" : "border-plate-bad text-plate-bad"
          }`}
        >
          {state.ok ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          )}
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
