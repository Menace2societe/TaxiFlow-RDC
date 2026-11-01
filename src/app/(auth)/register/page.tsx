import Link from "next/link";
import { UserPlus } from "lucide-react";
import { registerPartner } from "@/actions/register";
import { ROUTES } from "@/lib/routes";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { choiceClass } from "@/components/auth/choice";
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
    <div className="w-full">
      <h1 className="font-plate text-[clamp(2.4rem,6vw,3rem)] font-bold leading-none">Rejoindre TaxiFlow RDC</h1>
      <p className="mt-3 text-[17px]">
        Propriétaire de flotte ou chauffeur sur le terrain : créez votre accès en moins de 2 minutes.
      </p>

      {error && (
        <AuthNotice tone="bad" className="mt-6">
          {error}
        </AuthNotice>
      )}

      <form action={registerPartner} className="mt-6 grid gap-5">
        {/* Nom complet */}
        <div>
          <label htmlFor="reg-fullname" className="block text-[15px] font-semibold">
            Nom complet
          </label>
          <input
            id="reg-fullname"
            className="field mt-1.5"
            name="full_name"
            type="text"
            autoComplete="name"
            placeholder="Jean-Pierre Mukendi"
            required
            minLength={2}
          />
        </div>

        {/* Téléphone : indicatif +243 fixe + vrai champ tel */}
        <div>
          <label htmlFor="phone" className="block text-[15px] font-semibold">
            Téléphone
          </label>
          <div className="mt-1.5 flex gap-2">
            <span
              id="phone-prefix"
              className="inline-flex min-h-[52px] shrink-0 items-center rounded-lg border-2 border-plate-ink bg-plate-ground px-3 text-[17px] font-bold"
            >
              +243
            </span>
            <input
              id="phone"
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              placeholder="812 345 678"
              aria-describedby="phone-prefix"
              className="field min-w-0 flex-1"
            />
          </div>
        </div>

        {/* Sélecteur de rôle */}
        <fieldset>
          <legend className="mb-1.5 text-[15px] font-semibold">Je m&apos;inscris en tant que</legend>
          <div className="grid grid-cols-2 gap-2">
            <label id="role-driver-label" className="cursor-pointer">
              <input
                type="radio"
                name="role"
                value="driver"
                defaultChecked
                className="peer sr-only"
                aria-labelledby="role-driver-label"
              />
              <span className={choiceClass}>
                <span className="text-[17px] font-bold">Chauffeur</span>
                <span className="text-[15px] font-medium">Terrain et versements</span>
              </span>
            </label>

            <label id="role-investor-label" className="cursor-pointer">
              <input
                type="radio"
                name="role"
                value="investor"
                className="peer sr-only"
                aria-labelledby="role-investor-label"
              />
              <span className={choiceClass}>
                <span className="text-[17px] font-bold">Investisseur</span>
                <span className="text-[15px] font-medium">Flotte et revenus</span>
              </span>
            </label>
          </div>
        </fieldset>

        {/* Chauffeur-patron : visible uniquement si rôle = chauffeur */}
        <OwnerDriverToggle />

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="block text-[15px] font-semibold">
            Adresse email
          </label>
          <input
            id="reg-email"
            className="field mt-1.5"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            required
          />
        </div>

        {/* Mot de passe */}
        <div>
          <label htmlFor="reg-password" className="block text-[15px] font-semibold">
            Mot de passe <span className="font-normal">(8 caractères au moins)</span>
          </label>
          <input
            id="reg-password"
            className="field mt-1.5"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            required
          />
        </div>

        <button id="register-submit" type="submit" className="btn-primary w-full">
          <UserPlus size={18} aria-hidden />
          Créer mon compte
        </button>

        <p className="text-[15px]">
          En créant un compte, vous acceptez les{" "}
          <Link href={ROUTES.TERMS} className="underline underline-offset-4">
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href={ROUTES.PRIVACY} className="underline underline-offset-4">
            politique de confidentialité
          </Link>
          .
        </p>
      </form>

      <section aria-labelledby="already" className="mt-8 border-t-2 border-plate-rule pt-6">
        <h2 id="already" className="text-[16px] font-semibold">
          Déjà inscrit ?
        </h2>
        <Link href={ROUTES.LOGIN} id="link-to-login" className="btn-secondary mt-3 w-full text-center no-underline">
          Se connecter
        </Link>
      </section>
    </div>
  );
}
