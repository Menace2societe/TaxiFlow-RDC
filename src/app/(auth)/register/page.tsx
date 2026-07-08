import Link from "next/link";
import { UserPlus, Building2, UserRound, Mail, Lock, Phone, User } from "lucide-react";
import { registerPartner } from "@/actions/register";
import { ROUTES } from "@/lib/routes";
import { OwnerDriverToggle } from "@/components/auth/OwnerDriverToggle";

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
    <div className="w-full max-w-md animate-fade-in-up">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/40">
          <UserPlus className="text-white" size={22} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Rejoindre TaxiFlow RDC
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          Propriétaire de flotte ou chauffeur sur le terrain — créez votre accès en moins de 2 minutes.
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Form ── */}
      <form action={registerPartner} className="space-y-5">

        {/* Nom complet */}
        <div className="space-y-1.5">
          <label
            htmlFor="reg-fullname"
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-300"
          >
            <User size={13} aria-hidden className="text-neutral-500" />
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

        {/* ── Téléphone : badge fixe +243 + vrai input tel ── */}
        <div className="space-y-1.5">
          <label
            htmlFor="phone"
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-300"
          >
            <Phone size={13} aria-hidden className="text-neutral-500" />
            Téléphone
          </label>
          <div className="flex w-full items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/70 p-1.5">
            <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 text-sm font-bold text-emerald-300">
              +243
            </span>
            <input
              id="phone"
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              placeholder="812 345 678"
              className="flex-1 w-full relative z-10 cursor-text px-3 py-2 bg-neutral-950 text-white border border-neutral-800 rounded-md focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Sélecteur de rôle */}
        <fieldset className="space-y-2">
          <legend className="flex items-center gap-1.5 text-sm font-medium text-neutral-300">
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
              <div className="flex flex-col items-center gap-2.5 rounded-xl border-2 border-neutral-700 bg-neutral-800/60 p-4 text-center transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-950/40 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-700/60 peer-checked:bg-emerald-900/60">
                  <UserRound
                    className="text-neutral-400 transition-colors peer-checked:text-emerald-400"
                    size={22}
                    aria-hidden
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Chauffeur
                  </p>
                  <p className="text-xs text-neutral-400">
                    Terrain &amp; versements
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
              <div className="flex flex-col items-center gap-2.5 rounded-xl border-2 border-neutral-700 bg-neutral-800/60 p-4 text-center transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-950/40 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-700/60 peer-checked:bg-emerald-900/60">
                  <Building2
                    className="text-neutral-400 transition-colors peer-checked:text-emerald-400"
                    size={22}
                    aria-hidden
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Investisseur
                  </p>
                  <p className="text-xs text-neutral-400">
                    Flotte &amp; revenus
                  </p>
                </div>
              </div>
            </label>

          </div>
        </fieldset>

        {/* Toggle Chauffeur-Patron — visible uniquement si rôle = driver */}
        <OwnerDriverToggle />

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="reg-email"
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-300"
          >
            <Mail size={13} aria-hidden className="text-neutral-500" />
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
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-300"
          >
            <Lock size={13} aria-hidden className="text-neutral-500" />
            Mot de passe{" "}
            <span className="ml-auto font-normal text-neutral-500">(min. 8 caractères)</span>
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

        <p className="text-center text-xs text-neutral-500">
          En créant un compte, vous acceptez les conditions d&apos;utilisation de TaxiFlow RDC.
        </p>
      </form>

      {/* ── Divider ── */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-neutral-950 px-3 text-xs text-neutral-500">
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
