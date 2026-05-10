import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

type SignupPageProps = {
  searchParams?: { error?: string; notice?: string };
};

async function signup(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const role = String(formData.get("role") ?? "driver") as UserRole;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role
      }
    }
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await (supabase.from("profiles") as any).upsert({
      id: data.user.id,
      full_name: fullName,
      phone,
      role
    });
  }

  redirect("/login?notice=Compte cree. Verifiez votre email si la confirmation est active.");
}

export default function SignupPage({ searchParams }: SignupPageProps) {
  return (
    <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-soft">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Creer un compte</h1>
        <p className="mt-2 text-sm text-stone-600">Configurez votre acces TaxiFlow RDC.</p>
      </div>

      {searchParams?.error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </p>
      ) : null}

      <form action={signup} className="space-y-4">
        <label className="block text-sm font-medium">
          Nom complet
          <input className="field mt-1" name="full_name" autoComplete="name" required />
        </label>
        <label className="block text-sm font-medium">
          Telephone
          <input className="field mt-1" name="phone" autoComplete="tel" />
        </label>
        <label className="block text-sm font-medium">
          Role
          <select className="field mt-1" name="role" defaultValue="driver">
            <option value="driver">Chauffeur</option>
            <option value="investor">Investisseur</option>
            <option value="admin">Administrateur</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Email
          <input className="field mt-1" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-medium">
          Mot de passe
          <input className="field mt-1" name="password" type="password" minLength={8} autoComplete="new-password" required />
        </label>
        <button className="btn-primary w-full" type="submit">
          <UserPlus size={18} aria-hidden />
          Creer le compte
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-stone-600">
        Deja inscrit?{" "}
        <Link className="font-semibold text-palm" href="/login">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
