"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, MessageSquareText } from "lucide-react";
import { sendLoginCode, verifyLoginCode, type SmsLoginState } from "@/actions/sms-login";
import { ROUTES } from "@/lib/routes";

const initialState: SmsLoginState = { step: "phone" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary min-h-12 w-full" disabled={pending}>
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <MessageSquareText size={16} aria-hidden />}
      {label}
    </button>
  );
}

export function SmsLoginForm() {
  const [sendState, sendAction] = useFormState(sendLoginCode, initialState);
  const [verifyState, verifyAction] = useFormState(verifyLoginCode, initialState);
  const onCodeStep = sendState.step === "code";
  const notice = onCodeStep && verifyState.message ? verifyState : sendState;

  return (
    <div className="space-y-4">
      {notice.message ? (
        <p
          role={notice.error ? "alert" : "status"}
          className={`rounded-lg border px-4 py-3 text-sm ${
            notice.error
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300"
          }`}
        >
          {notice.message}
        </p>
      ) : null}

      {!onCodeStep ? (
        <form action={sendAction} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
            Votre numéro de téléphone
            <input className="field" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="081 234 5678" required />
          </label>
          <fieldset className="grid grid-cols-2 gap-2 text-sm">
            <legend className="mb-1.5 font-medium text-stone-700 dark:text-stone-300">Recevoir le code par</legend>
            {(["sms", "whatsapp"] as const).map((channel) => (
              <label key={channel} className="cursor-pointer">
                <input type="radio" name="channel" value={channel} defaultChecked={channel === "sms"} className="peer sr-only" />
                <span className="flex min-h-11 items-center justify-center rounded-lg border border-stone-300 font-semibold peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 dark:border-stone-600 dark:peer-checked:bg-emerald-950 dark:peer-checked:text-emerald-200">
                  {channel === "sms" ? "SMS" : "WhatsApp"}
                </span>
              </label>
            ))}
          </fieldset>
          <SubmitButton label="Recevoir mon code" />
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="phone" value={sendState.phone} />
          <label className="block space-y-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
            Code à 6 chiffres
            <input
              className="field text-center text-2xl tracking-[0.5em]"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
              autoFocus
            />
          </label>
          <SubmitButton label="Se connecter" />
          <p className="text-center text-xs text-stone-500">
            {/* Lien classique : recharge la page et revient à l'étape du numéro. */}
            Pas reçu ? <a className="underline" href={`${ROUTES.LOGIN}/sms`}>Redemander un code</a>
          </p>
        </form>
      )}
    </div>
  );
}
