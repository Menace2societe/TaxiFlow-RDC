"use client";

import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { changeMyPassword, type ChangePasswordState } from "@/actions/profile";

const initialState: ChangePasswordState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary min-h-11" disabled={pending}>
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <KeyRound size={16} aria-hidden />}
      Changer mon code
    </button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useFormState(changeMyPassword, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-3">
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Nouveau code ou mot de passe
        <input className="field mt-1" name="password" type="password" minLength={8} autoComplete="new-password" required />
      </label>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Confirmer
        <input className="field mt-1" name="confirm" type="password" minLength={8} autoComplete="new-password" required />
      </label>
      {state.message ? (
        <p role="status" className={`text-sm ${state.ok ? "text-emerald-600 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}`}>
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
