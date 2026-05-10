import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: { error?: string; next?: string; notice?: string };
};

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  let next = String(formData.get("next") ?? "");
  
  if (next === "/login" || next === "/signup") {
    next = "";
  }

  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  // Fetch the role from the profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = profile?.role;

  if (!role) {
    // Sign out the user since they don't have a valid role/profile to use the app
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Aucun rôle associé à ce compte. Veuillez contacter l'administrateur.")}`);
  }

  if (next && next.startsWith("/")) {
    redirect(next);
  }

  // Dynamic redirect based on role
  if (role === "admin") {
    redirect("/dashboard/overview");
  } else if (role === "investor") {
    redirect("/investor/dashboard");
  } else if (role === "driver") {
    redirect("/driver/dashboard");
  } else {
    redirect(`/login?error=${encodeURIComponent("Rôle non reconnu.")}`);
  }
}

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

      <form action={login} className="space-y-4">
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
