import Link from "next/link";
import { Building2, UserPlus, UserRound } from "lucide-react";
import { registerPartner } from "@/actions/register";
import { ROUTES } from "@/lib/routes";

type RegisterPageProps = {
  searchParams?: { error?: string };
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  return (
    <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-lg dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Inscription</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Proprietaire de flotte ou chauffeur sur le terrain.</p>
      </div>

      {searchParams?.error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {searchParams.error}
        </p>
      ) : null}

      <form action={registerPartner} className="space-y-4">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Nom complet
          <input className="field mt-1" name="full_name" autoComplete="name" required minLength={2} />
        </label>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Telephone
          <input className="field mt-1" name="phone" type="tel" autoComplete="tel" placeholder="+243 ..." />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-stone-700 dark:text-stone-300">Je suis</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="cursor-pointer">
              <input type="radio" name="role" value="investor" className="peer sr-only" />
              <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:ring-1 peer-checked:ring-emerald-500 dark:border-stone-700 dark:bg-stone-800 dark:peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-950/40">
                <Building2 className="text-emerald-700 dark:text-emerald-400" size={22} aria-hidden />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">Proprietaire</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Investisseur / flotte</p>
                </div>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="role" value="driver" defaultChecked className="peer sr-only" />
              <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:ring-1 peer-checked:ring-emerald-500 dark:border-stone-700 dark:bg-stone-800 dark:peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-950/40">
                <UserRound className="text-emerald-700 dark:text-emerald-400" size={22} aria-hidden />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">Chauffeur</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Terrain & versements</p>
                </div>
              </div>
            </label>
          </div>
        </fieldset>

        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Email
          <input className="field mt-1" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Mot de passe (min. 8 caracteres)
          <input className="field mt-1" name="password" type="password" minLength={8} autoComplete="new-password" required />
        </label>

        <button className="btn-primary flex w-full min-h-11 items-center justify-center gap-2" type="submit">
          <UserPlus size={18} aria-hidden />
          Creer mon compte
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-600 dark:text-stone-400">
        Deja inscrit ?{" "}
        <Link className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400" href={ROUTES.LOGIN}>
          Se connecter
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-stone-500">
        <Link href={ROUTES.SIGNUP} className="hover:text-emerald-700 dark:hover:text-emerald-400">
          Besoin du role administrateur ? Inscription avancee
        </Link>
      </p>
    </div>
  );
}
