import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { FREE_VEHICLES, TRIAL_DAYS } from "@/lib/billing/plans";
import { ROUTES } from "@/lib/routes";
import type { UserRole } from "@/lib/supabase/types";

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const metadata = {
  title: "Accès avancé — TaxiFlow RDC",
  description:
    "Inscription avancée des chauffeurs et investisseurs TaxiFlow RDC.",
};

// ─── Server Action ────────────────────────────────────────────────────────────
async function signupAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "driver");
  // L'inscription publique ne crée jamais d'admin (le trigger handle_new_user le garantit aussi).
  const role: UserRole = requestedRole === "investor" ? "investor" : "driver";

  if (!email || !password || !fullName) {
    redirect(
      `${ROUTES.SIGNUP}?error=${encodeURIComponent("Veuillez remplir tous les champs obligatoires.")}`
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, role },
    },
  });

  if (error) {
    redirect(`${ROUTES.SIGNUP}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `${ROUTES.LOGIN}?notice=${encodeURIComponent(
      "Compte créé avec succès. Vérifiez votre email si la confirmation est activée."
    )}`
  );
}

// ─── Ce que chaque rôle obtient ───────────────────────────────────────────────
const benefits = [
  {
    role: "driver" as const,
    title: "Chauffeurs",
    perks: [
      "Suivi de vos versements quotidiens",
      "Historique de vos courses et kilomètres",
      "Signalement de pannes en temps réel",
      "Accès à votre profil conducteur",
    ],
  },
  {
    role: "investor" as const,
    title: "Investisseurs",
    perks: [
      "Tableau de bord des revenus et de la flotte",
      "Suivi de chaque véhicule en temps réel",
      "Recettes de la semaine par véhicule, export CSV",
      "Gestion de plusieurs chauffeurs au même endroit",
    ],
  },
];

// ─── Page Props ───────────────────────────────────────────────────────────────
type SignupPageProps = {
  searchParams?: Promise<{ error?: string; notice?: string }>;
};

// ─── Page Component ───────────────────────────────────────────────────────────
export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const error = params?.error;
  const notice = params?.notice;

  return (
    <div className="w-full">
      <h1 className="font-plate text-[clamp(2.4rem,6vw,3rem)] font-bold leading-none">Accès complet</h1>
      <p className="mt-3 text-[17px]">
        Inscription avancée : choisissez votre rôle et débloquez toutes les fonctionnalités de la plateforme.
      </p>

      {/* ── Ce que chaque rôle obtient ── */}
      <dl className="mt-6 border-t-2 border-plate-ink">
        {benefits.map(({ role, title, perks }) => (
          <div key={role} className="border-b-2 border-plate-rule py-4">
            <dt className="font-plate text-[24px] font-bold leading-tight">{title}</dt>
            <dd className="mt-1.5">
              <ul className="grid gap-1 text-[16px]">
                {perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[15px] font-medium">
        {FREE_VEHICLES} véhicule gratuit pour toujours · {TRIAL_DAYS} jours d&apos;essai · paiement par M-Pesa, Airtel Money
        ou Orange Money
      </p>

      {/* ── Messages ── */}
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

      {/* ── Formulaire ── */}
      <form action={signupAction} aria-labelledby="signup-form-title" className="mt-8 grid gap-5">
        <h2 id="signup-form-title" className="font-plate text-[26px] font-bold leading-tight">
          Créer votre compte
        </h2>
        <p className="-mt-3 text-[15px]">Les champs marqués d&apos;une * sont obligatoires.</p>

        {/* Nom complet */}
        <div>
          <label htmlFor="su-fullname" className="block text-[15px] font-semibold">
            Nom complet <span aria-hidden>*</span>
          </label>
          <input
            id="su-fullname"
            className="field mt-1.5"
            name="full_name"
            type="text"
            autoComplete="name"
            placeholder="Jean-Pierre Mukendi"
            required
            minLength={2}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="su-email" className="block text-[15px] font-semibold">
            Email <span aria-hidden>*</span>
          </label>
          <input
            id="su-email"
            className="field mt-1.5"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            required
          />
        </div>

        {/* Téléphone */}
        <div>
          <label htmlFor="su-phone" className="block text-[15px] font-semibold">
            Téléphone
          </label>
          <input
            id="su-phone"
            className="field mt-1.5"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+243 08X XXX XXXX"
          />
        </div>

        {/* Rôle */}
        <div>
          <label htmlFor="su-role" className="block text-[15px] font-semibold">
            Rôle <span aria-hidden>*</span>
          </label>
          <select id="su-role" className="field mt-1.5" name="role" defaultValue="driver" required>
            <option value="driver">Chauffeur</option>
            <option value="investor">Investisseur</option>
          </select>
        </div>

        {/* Mot de passe */}
        <div>
          <label htmlFor="su-password" className="block text-[15px] font-semibold">
            Mot de passe <span aria-hidden>*</span> <span className="font-normal">(8 caractères au moins)</span>
          </label>
          <input
            id="su-password"
            className="field mt-1.5"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            required
          />
        </div>

        <button id="signup-submit" type="submit" className="btn-primary w-full">
          <UserPlus size={18} aria-hidden />
          Créer le compte
          <ArrowRight size={18} aria-hidden />
        </button>
      </form>

      {/* ── Liens ── */}
      <div className="mt-8 grid gap-2 border-t-2 border-plate-rule pt-6 text-center text-[16px]">
        <p>
          Chauffeur ou investisseur ?{" "}
          <Link href={ROUTES.REGISTER} className="font-bold underline underline-offset-4">
            Inscription simplifiée
          </Link>
        </p>
        <p>
          Déjà un compte ?{" "}
          <Link href={ROUTES.LOGIN} className="font-bold underline underline-offset-4">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
