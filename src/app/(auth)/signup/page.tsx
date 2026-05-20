import Link from "next/link";
import {
  UserPlus,
  Building2,
  UserRound,
  ShieldCheck,
  TrendingUp,
  Truck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { UserRole } from "@/lib/supabase/types";

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const metadata = {
  title: "Accès avancé — TaxiFlow RDC",
  description:
    "Inscription avancée pour les gestionnaires et administrateurs de flotte TaxiFlow RDC.",
};

// ─── Server Action ────────────────────────────────────────────────────────────
async function signupAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("role") ?? "driver") as UserRole;

  if (!email || !password || !fullName) {
    redirect(
      `${ROUTES.SIGNUP}?error=${encodeURIComponent("Veuillez remplir tous les champs obligatoires.")}`
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, role },
    },
  });

  if (error) {
    redirect(`${ROUTES.SIGNUP}?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await (supabase.from("profiles") as any).upsert({
      id: data.user.id,
      full_name: fullName || null,
      phone: phone || null,
      role,
    });
  }

  redirect(
    `${ROUTES.LOGIN}?notice=${encodeURIComponent(
      "Compte créé avec succès. Vérifiez votre email si la confirmation est activée."
    )}`
  );
}

// ─── Benefit Card data ────────────────────────────────────────────────────────
const benefits = [
  {
    role: "driver" as const,
    icon: UserRound,
    title: "Chauffeurs",
    color: "from-emerald-500 to-teal-600",
    accent: "text-emerald-600 dark:text-emerald-400",
    perks: [
      "Suivi de vos versements quotidiens",
      "Historique de vos courses et km",
      "Signalement de pannes en temps réel",
      "Accès à votre profil conducteur",
    ],
  },
  {
    role: "investor" as const,
    icon: Building2,
    title: "Investisseurs",
    color: "from-sky-500 to-blue-600",
    accent: "text-sky-600 dark:text-sky-400",
    perks: [
      "Tableau de bord revenus & flotte",
      "Suivi de chaque véhicule en temps réel",
      "Rapports financiers hebdomadaires",
      "Gestion multi-chauffeurs centralisée",
    ],
  },
  {
    role: "admin" as const,
    icon: ShieldCheck,
    title: "Gestionnaires",
    color: "from-violet-500 to-purple-700",
    accent: "text-violet-600 dark:text-violet-400",
    perks: [
      "Vue globale sur toute la flotte",
      "Gestion des utilisateurs & rôles",
      "Rapports d'exploitation avancés",
      "Paramétrage et supervision totale",
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
    <div className="w-full max-w-lg">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-900/30">
          <ShieldCheck className="text-white" size={20} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          Accès complet
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Inscription avancée — choisissez votre rôle et débloquez toutes les fonctionnalités de la plateforme.
        </p>
      </div>

      {/* ── Benefits cards ── */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {benefits.map(({ role, icon: Icon, title, color, accent, perks }) => (
          <div
            key={role}
            className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700/60 dark:bg-stone-800/50"
          >
            <div
              className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${color} shadow`}
            >
              <Icon className="text-white" size={17} aria-hidden />
            </div>
            <p className={`mb-2 text-sm font-semibold ${accent}`}>{title}</p>
            <ul className="space-y-1.5">
              {perks.map((perk) => (
                <li
                  key={perk}
                  className="flex items-start gap-1.5 text-xs leading-snug text-stone-600 dark:text-stone-400"
                >
                  <CheckCircle2
                    size={12}
                    className="mt-0.5 shrink-0 text-stone-400 dark:text-stone-500"
                    aria-hidden
                  />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Stats strip ── */}
      <div className="mb-8 grid grid-cols-3 divide-x divide-stone-200 rounded-xl border border-stone-200 bg-stone-50 dark:divide-stone-700 dark:border-stone-700/60 dark:bg-stone-800/30">
        {[
          { icon: Truck, label: "Véhicules suivis", value: "500+" },
          { icon: UserRound, label: "Chauffeurs actifs", value: "300+" },
          { icon: TrendingUp, label: "Revenus gérés /mois", value: "$120k+" },
        ].map(({ icon: StatIcon, label, value }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 px-3 py-4">
            <StatIcon size={16} className="mb-1 text-stone-400" aria-hidden />
            <span className="text-base font-bold text-stone-800 dark:text-stone-100">
              {value}
            </span>
            <span className="text-center text-[10px] leading-tight text-stone-500 dark:text-stone-400">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Alerts ── */}
      {notice && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
          <span>{notice}</span>
        </div>
      )}
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
      <form
        action={signupAction}
        className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-soft dark:border-stone-700/60 dark:bg-stone-900"
      >
        <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Créer votre compte
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Nom complet */}
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="su-fullname"
              className="text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              id="su-fullname"
              className="field"
              name="full_name"
              type="text"
              autoComplete="name"
              placeholder="Jean-Pierre Mukendi"
              required
              minLength={2}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="su-email"
              className="text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="su-email"
              className="field"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              required
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-1.5">
            <label
              htmlFor="su-phone"
              className="text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Téléphone
            </label>
            <input
              id="su-phone"
              className="field"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+243 08X XXX XXXX"
            />
          </div>

          {/* Rôle */}
          <div className="space-y-1.5">
            <label
              htmlFor="su-role"
              className="text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Rôle <span className="text-red-500">*</span>
            </label>
            <select
              id="su-role"
              className="field"
              name="role"
              defaultValue="driver"
              required
            >
              <option value="driver">Chauffeur</option>
              <option value="investor">Investisseur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          {/* Mot de passe */}
          <div className="space-y-1.5">
            <label
              htmlFor="su-password"
              className="text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Mot de passe <span className="text-red-500">*</span>
              <span className="ml-1 font-normal text-stone-400">(min. 8 car.)</span>
            </label>
            <input
              id="su-password"
              className="field"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {/* Submit */}
        <button
          id="signup-submit"
          type="submit"
          className="btn-primary mt-1 w-full"
        >
          <UserPlus size={17} aria-hidden />
          Créer le compte
          <ArrowRight size={15} aria-hidden />
        </button>
      </form>

      {/* ── Footer links ── */}
      <div className="mt-5 flex flex-col items-center gap-2 text-center text-sm text-stone-500 dark:text-stone-400">
        <p>
          Chauffeur ou investisseur ?{" "}
          <Link
            href={ROUTES.REGISTER}
            className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Inscription simplifiée
          </Link>
        </p>
        <p>
          Déjà un compte ?{" "}
          <Link
            href={ROUTES.LOGIN}
            className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
