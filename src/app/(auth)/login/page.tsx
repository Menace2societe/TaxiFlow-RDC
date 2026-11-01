import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { createClient } from "@/lib/supabase/server";
import { driverLoginEmail, normalizeAccessCode, normalizeDrcPhone } from "@/lib/auth/driver-access";
import { ROUTES, isSafeInternalPath } from "@/lib/routes";

// ─── Metadata ────────────────────────────────────────────────────────────────
export const metadata = {
  title: "Connexion — TaxiFlow RDC",
  description:
    "Connectez-vous à votre espace TaxiFlow RDC pour gérer votre flotte ou suivre vos revenus.",
};

// ─── Server Action ───────────────────────────────────────────────────────────
async function loginAction(formData: FormData) {
  "use server";

  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!identifier || !password) {
    redirect(`${ROUTES.LOGIN}?error=${encodeURIComponent("Veuillez remplir tous les champs.")}`);
  }

  const supabase = await createClient();

  // Chauffeur créé par son investisseur : numéro de téléphone + code d'accès.
  const phone = identifier.includes("@") ? null : normalizeDrcPhone(identifier);
  const email = phone ? driverLoginEmail(phone) : identifier;

  let { error } = await supabase.auth.signInWithPassword({ email, password });

  // Le code d'accès peut être tapé en minuscules ou avec le tiret affiché.
  if (error && phone && normalizeAccessCode(password) !== password) {
    ({ error } = await supabase.auth.signInWithPassword({ email, password: normalizeAccessCode(password) }));
  }

  if (error) {
    redirect(
      `${ROUTES.LOGIN}?error=${encodeURIComponent(
        error.message === "Invalid login credentials"
          ? phone
            ? "Numéro ou code d'accès incorrect. Demandez un nouveau code à votre investisseur."
            : "Email ou mot de passe incorrect."
          : error.message
      )}`
    );
  }

  const destination = isSafeInternalPath(next) ? next : ROUTES.DASHBOARD_OVERVIEW;
  redirect(destination);
}

// ─── Page Props ───────────────────────────────────────────────────────────────
type LoginPageProps = {
  searchParams?: Promise<{ error?: string; notice?: string; next?: string }>;
};

// ─── Page Component ───────────────────────────────────────────────────────────
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params?.error;
  const notice = params?.notice;
  const next = params?.next ?? "";

  return (
    <div className="w-full">
      <h1 className="font-plate text-[clamp(2.4rem,6vw,3rem)] font-bold leading-none">Bon retour.</h1>
      <p className="mt-3 text-[17px]">Connectez-vous à votre espace TaxiFlow&nbsp;RDC.</p>

      {notice && (
        <AuthNotice tone="ok" className="mt-6">
          {notice}
        </AuthNotice>
      )}

      {error && (
        <AuthNotice tone="bad" className="mt-6">
          {error}
        </AuthNotice>
      )}

      <form action={loginAction} className="mt-6 grid gap-5">
        {next && <input type="hidden" name="next" value={next} />}

        <div>
          <label htmlFor="login-email" className="block text-[15px] font-semibold">
            Email ou téléphone
          </label>
          <input
            id="login-email"
            className="field mt-1.5"
            name="email"
            type="text"
            autoComplete="username"
            placeholder="vous@exemple.com ou 081 234 5678"
            aria-describedby="login-email-hint"
            required
          />
          <p id="login-email-hint" className="mt-1.5 text-[15px] text-plate-soft">
            Chauffeur inscrit par votre investisseur : votre numéro et le code reçu.
          </p>
        </div>

        <div>
          <label htmlFor="login-password" className="block text-[15px] font-semibold">
            Mot de passe ou code
          </label>
          <input
            id="login-password"
            className="field mt-1.5"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        <button id="login-submit" type="submit" className="btn-primary w-full gap-2">
          Se connecter
          <ArrowRight size={18} aria-hidden />
        </button>
      </form>

      {process.env.NEXT_PUBLIC_SMS_LOGIN_ENABLED === "true" ? (
        <Link href={`${ROUTES.LOGIN}/sms`} className="btn-secondary mt-3 flex w-full justify-center px-4 text-center no-underline">
          Chauffeur : recevoir un code par SMS ou WhatsApp
        </Link>
      ) : null}

      <section aria-labelledby="no-account" className="mt-8 border-t-2 border-plate-rule pt-6">
        <h2 id="no-account" className="text-[16px] font-semibold">
          Pas encore de compte ?
        </h2>
        <Link href={ROUTES.REGISTER} id="link-to-register" className="btn-secondary mt-3 w-full text-center no-underline">
          Créer un compte partenaire
        </Link>
        <p className="mt-4 text-center text-[15px]">
          Gestionnaire ?{" "}
          <Link href={ROUTES.SIGNUP} className="font-bold underline underline-offset-4">
            Inscription avancée
          </Link>
        </p>
      </section>
    </div>
  );
}
