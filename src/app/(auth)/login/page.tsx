import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn, Mail, Lock, ArrowRight } from "lucide-react";
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
    <div className="w-full max-w-md">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/30">
          <LogIn className="text-white" size={20} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          Bon retour.
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Connectez-vous à votre espace TaxiFlow&nbsp;RDC.
        </p>
      </div>

      {/* ── Notice ── */}
      {notice && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
          <span>{notice}</span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
        >
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Form ── */}
      <form action={loginAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        {/* Email */}
        <div className="group space-y-1.5">
          <label
            htmlFor="login-email"
            className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            <Mail size={13} aria-hidden className="text-stone-400" />
            Email ou téléphone
          </label>
          <input
            id="login-email"
            className="field"
            name="email"
            type="text"
            autoComplete="username"
            placeholder="vous@exemple.com ou 081 234 5678"
            required
          />
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Chauffeur inscrit par votre investisseur : votre numéro et le code reçu.
          </p>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              <Lock size={13} aria-hidden className="text-stone-400" />
              Mot de passe ou code
            </label>
          </div>
          <input
            id="login-password"
            className="field"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        {/* Submit */}
        <button
          id="login-submit"
          type="submit"
          className="btn-primary mt-1 w-full gap-2"
        >
          Se connecter
          <ArrowRight size={16} aria-hidden />
        </button>
      </form>

      {process.env.NEXT_PUBLIC_SMS_LOGIN_ENABLED === "true" ? (
        <Link
          href={`${ROUTES.LOGIN}/sms`}
          className="btn-secondary mt-3 flex min-h-11 w-full justify-center"
        >
          Chauffeur : recevoir un code par SMS ou WhatsApp
        </Link>
      ) : null}

      {/* ── Divider ── */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200 dark:border-stone-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-stone-400 dark:bg-stone-900 dark:text-stone-500">
            Pas encore de compte ?
          </span>
        </div>
      </div>

      {/* ── Register Link ── */}
      <Link
        href={ROUTES.REGISTER}
        id="link-to-register"
        className="btn-secondary w-full text-center"
      >
        Créer un compte partenaire
      </Link>

      <p className="mt-4 text-center text-xs text-stone-400 dark:text-stone-500">
        Gestionnaire ?{" "}
        <Link
          href={ROUTES.SIGNUP}
          className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Inscription avancée
        </Link>
      </p>
    </div>
  );
}
