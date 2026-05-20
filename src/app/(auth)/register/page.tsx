import Link from "next/link";
import { UserPlus, Building2, UserRound, Mail, Lock, Phone, User } from "lucide-react";
import { registerPartner } from "@/actions/register";
import { ROUTES } from "@/lib/routes";

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const metadata = {
  title: "Inscription — TaxiFlow RDC",
  description:
    "Créez votre compte TaxiFlow RDC en tant que chauffeur ou investisseur à Kinshasa.",
};

// ─── Page Props ───────────────────────────────────────────────────────────────
type RegisterPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

// ─── Page Component ───────────────────────────────────────────────────────────
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="w-full max-w-md">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/30">
          <UserPlus className="text-white" size={20} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          Rejoindre TaxiFlow RDC
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Propriétaire de flotte ou chauffeur sur le terrain — créez votre accès en moins de 2 minutes.
        </p>
      </div>

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
      <form action={registerPartner} className="space-y-4">

        {/* Nom complet */}
        <div className="space-y-1.5">
          <label
            htmlFor="reg-fullname"
            className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            <User size={13} aria-hidden className="text-stone-400" />
            Nom complet
          </label>
          <input
            id="reg-fullname"
            className="field"
            name="full_name"
            type="text"
            autoComplete="name"
            placeholder="Jean-Pierre Mukendi"
            required
            minLength={2}
          />
        </div>

        {/* Téléphone */}
        <div className="space-y-1.5">
          <label
            htmlFor="reg-phone"
            className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            <Phone size={13} aria-hidden className="text-stone-400" />
            Téléphone
          </label>
          <div className="flex gap-2">
            <span className="field w-24 shrink-0 cursor-default select-none bg-stone-100 text-center text-sm font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              +243
            </span>
            <input
              id="reg-phone"
              className="field flex-1"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="08X XXX XXXX"
            />
          </div>
        </div>

        {/* Sélecteur de rôle */}
        <fieldset className="space-y-2">
          <legend className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
            Je m&apos;inscris en tant que
          </legend>
          <div className="grid grid-cols-2 gap-3">

            {/* Chauffeur */}
            <label id="role-driver-label" className="cursor-pointer">
              <input
                type="radio"
                name="role"
                value="driver"
                defaultChecked
                className="peer sr-only"
                aria-labelledby="role-driver-label"
              />
              <div className="flex flex-col items-center gap-2.5 rounded-xl border-2 border-stone-200 bg-stone-50 p-4 text-center transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:shadow-sm peer-checked:shadow-emerald-500/10 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 peer-focus-visible:ring-offset-2 dark:border-stone-700 dark:bg-stone-800/60 dark:peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-950/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-stone-700 peer-checked:dark:bg-emerald-900/40">
                  <UserRound
                    className="text-stone-500 transition-colors peer-checked:text-emerald-600 dark:text-stone-400 dark:peer-checked:text-emerald-400"
                    size={22}
                    aria-hidden
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                    Chauffeur
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Terrain & versements
                  </p>
                </div>
              </div>
            </label>

            {/* Investisseur */}
            <label id="role-investor-label" className="cursor-pointer">
              <input
                type="radio"
                name="role"
                value="investor"
                className="peer sr-only"
                aria-labelledby="role-investor-label"
              />
              <div className="flex flex-col items-center gap-2.5 rounded-xl border-2 border-stone-200 bg-stone-50 p-4 text-center transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:shadow-sm peer-checked:shadow-emerald-500/10 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 peer-focus-visible:ring-offset-2 dark:border-stone-700 dark:bg-stone-800/60 dark:peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-950/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-stone-700 peer-checked:dark:bg-emerald-900/40">
                  <Building2
                    className="text-stone-500 transition-colors peer-checked:text-emerald-600 dark:text-stone-400 dark:peer-checked:text-emerald-400"
                    size={22}
                    aria-hidden
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                    Investisseur
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Flotte & revenus
                  </p>
                </div>
              </div>
            </label>

          </div>
        </fieldset>

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="reg-email"
            className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            <Mail size={13} aria-hidden className="text-stone-400" />
            Adresse email
          </label>
          <input
            id="reg-email"
            className="field"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            required
          />
        </div>

        {/* Mot de passe */}
        <div className="space-y-1.5">
          <label
            htmlFor="reg-password"
            className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            <Lock size={13} aria-hidden className="text-stone-400" />
            Mot de passe{" "}
            <span className="ml-auto font-normal text-stone-400">(min. 8 caractères)</span>
          </label>
          <input
            id="reg-password"
            className="field"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            required
          />
        </div>

        {/* Submit */}
        <button
          id="register-submit"
          type="submit"
          className="btn-primary mt-2 w-full"
        >
          <UserPlus size={17} aria-hidden />
          Créer mon compte
        </button>

        <p className="text-center text-xs text-stone-400 dark:text-stone-500">
          En créant un compte, vous acceptez les conditions d&apos;utilisation de TaxiFlow RDC.
        </p>
      </form>

      {/* ── Divider ── */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200 dark:border-stone-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-stone-400 dark:bg-stone-900 dark:text-stone-500">
            Déjà inscrit ?
          </span>
        </div>
      </div>

      <Link
        href={ROUTES.LOGIN}
        id="link-to-login"
        className="btn-secondary w-full text-center"
      >
        Se connecter
      </Link>
    </div>
  );
}
