import Link from "next/link";
import { LogIn } from "lucide-react";
import { signIn } from "@/lib/auth/actions";

type LoginPageProps = {
  searchParams?: { error?: string; next?: string; notice?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-soft">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Connexion</h1>
        <p className="mt-2 text-sm text-stone-600">Accedez a votre espace de gestion.</p>
      </div>

      {searchParams?.notice ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {searchParams.notice}
        </p>
      ) : null}

      {searchParams?.error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </p>
      ) : null}

      <form action={signIn} className="space-y-4">
        {searchParams?.next ? <input type="hidden" name="next" value={searchParams.next} /> : null}
        <label className="block text-sm font-medium">
          Email
          <input className="field mt-1" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-medium">
          Mot de passe
          <input className="field mt-1" name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn-primary w-full" type="submit">
          <LogIn size={18} aria-hidden />
          Se connecter
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-stone-600">
        Nouveau sur TaxiFlow?{" "}
        <Link className="font-semibold text-palm" href="/signup">
          Creer un compte
        </Link>
      </p>
    </div>
  );
}
