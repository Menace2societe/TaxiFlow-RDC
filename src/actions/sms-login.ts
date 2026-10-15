"use server";

import { redirect } from "next/navigation";
import { normalizeDrcPhone } from "@/lib/auth/driver-access";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type SmsLoginState = {
  step: "phone" | "code";
  phone?: string;
  channel?: "sms" | "whatsapp";
  message?: string;
  error?: boolean;
};

function explain(message: string): string {
  if (/provider|disabled|not enabled|Unsupported phone/i.test(message)) {
    return "La connexion par SMS n'est pas encore activée. Utilisez votre numéro et votre code d'accès.";
  }
  if (/Signups not allowed|not found|User not found/i.test(message)) {
    return "Aucun compte avec ce numéro. Demandez à votre investisseur de vous inscrire.";
  }
  if (/expired|invalid/i.test(message)) {
    return "Code incorrect ou expiré. Demandez un nouveau code.";
  }
  if (/rate|too many|seconds/i.test(message)) {
    return "Trop de demandes. Patientez une minute avant de redemander un code.";
  }
  return message;
}

/**
 * Étape 1 : Supabase envoie un code à 6 chiffres par SMS (ou WhatsApp).
 * shouldCreateUser: false — un numéro inconnu ne crée jamais de compte.
 */
export async function sendLoginCode(_prev: SmsLoginState, formData: FormData): Promise<SmsLoginState> {
  const phone = normalizeDrcPhone(String(formData.get("phone") ?? ""));
  const channel = formData.get("channel") === "whatsapp" ? "whatsapp" : "sms";
  if (!phone) {
    return { step: "phone", error: true, message: "Numéro RDC invalide (ex. 081 234 5678)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false, channel } });
  if (error) {
    return { step: "phone", error: true, message: explain(error.message) };
  }

  return {
    step: "code",
    phone,
    channel,
    message: `Code envoyé ${channel === "whatsapp" ? "sur WhatsApp" : "par SMS"} au ${phone}.`
  };
}

/** Étape 2 : vérification du code puis redirection vers l'espace du rôle. */
export async function verifyLoginCode(prev: SmsLoginState, formData: FormData): Promise<SmsLoginState> {
  const phone = normalizeDrcPhone(String(formData.get("phone") ?? ""));
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  if (!phone || !/^\d{6}$/.test(token)) {
    return { ...prev, step: "code", error: true, message: "Entrez les 6 chiffres reçus." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) {
    return { ...prev, step: "code", phone, error: true, message: explain(error.message) };
  }

  // La page d'accueil (et le middleware) envoient chacun vers son espace.
  redirect(ROUTES.HOME);
}
