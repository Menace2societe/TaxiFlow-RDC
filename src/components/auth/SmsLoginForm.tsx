"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, MessageSquareText } from "lucide-react";
import { sendLoginCode, verifyLoginCode, type SmsLoginState } from "@/actions/sms-login";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { ROUTES } from "@/lib/routes";

const initialState: SmsLoginState = { step: "phone" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <MessageSquareText size={18} aria-hidden />}
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
    <div className="grid gap-5">
      {notice.message ? <AuthNotice tone={notice.error ? "bad" : "ok"}>{notice.message}</AuthNotice> : null}

      {!onCodeStep ? (
        <form action={sendAction} className="grid gap-5">
          <label className="block text-[15px] font-semibold">
            Votre numéro de téléphone
            <input
              className="field mt-1.5"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="081 234 5678"
              required
            />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-[15px] font-semibold">Recevoir le code par</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["sms", "whatsapp"] as const).map((channel) => (
                <label key={channel} className="cursor-pointer">
                  <input type="radio" name="channel" value={channel} defaultChecked={channel === "sms"} className="peer sr-only" />
                  <span className="flex min-h-[52px] items-center justify-center rounded-lg border-2 border-plate-ink bg-plate-white text-[17px] font-bold peer-checked:bg-plate-ink peer-checked:text-plate-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-plate-band">
                    {channel === "sms" ? "SMS" : "WhatsApp"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <SubmitButton label="Recevoir mon code" />
        </form>
      ) : (
        <form action={verifyAction} className="grid gap-5">
          <input type="hidden" name="phone" value={sendState.phone} />
          <label className="block text-[15px] font-semibold">
            Code à 6 chiffres
            <input
              className="field mt-1.5 text-center font-plate text-[28px] font-bold tracking-[0.5em]"
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
          <p className="text-center text-[15px]">
            {/* Lien classique : recharge la page et revient à l'étape du numéro. */}
            Pas reçu ?{" "}
            <a className="font-bold underline underline-offset-4" href={`${ROUTES.LOGIN}/sms`}>
              Redemander un code
            </a>
          </p>
        </form>
      )}
    </div>
  );
}
