import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

type LoginPageProps = {
  searchParams?: { error?: string; next?: string; notice?: string };
};

async function login(formData: FormData) {
  "use server";
  console.log("[LOGIN ACTION] Starting login process...");

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  let next = String(formData.get("next") ?? "");
  
  if (next === "/login" || next === "/signup") {
    next = "";
  }

  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[LOGIN ACTION] Error signing in:", error.message);
    redirect(`/login?error=${encodeURIComponent(error.message)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  console.log("[LOGIN ACTION] Sign-in successful. User ID:", data.user.id);

  // Fetch the role from the profiles table
  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  console.log("[LOGIN ACTION] Profile fetch normal result:", profile, "Error:", profileError?.message);

  if (profileError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("[LOGIN ACTION] Normal fetch failed. Trying with service_role_key to bypass RLS...");
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    
    console.log("[LOGIN ACTION] Admin fetch result:", adminProfile, "Error:", adminError?.message);
    profile = adminProfile;
  }

  const role = profile?.role;
  console.log("[LOGIN ACTION] Role found:", role);

  if (!role) {
    console.error("[LOGIN ACTION] No role found. Signing out and redirecting to error.");
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Aucun rôle associé à ce compte. Veuillez vérifier votre profil ou contacter l'administrateur.")}`);
  }

  let targetPath = "";

  if (next && next.startsWith("/")) {
    targetPath = next;
  } else if (role === "admin") {
    targetPath = "/dashboard/overview";
  } else if (role === "investor") {
    targetPath = "/investor/dashboard";
  } else if (role === "driver") {
    targetPath = "/driver/dashboard";
  } else {
    redirect(`/login?error=${encodeURIComponent("Rôle non reconnu.")}`);
  }

  console.log(`[LOGIN ACTION] Redirecting to ${targetPath}`);
  redirect(targetPath); // redirect safely performs a 303 Redirect in Next.js Server Actions
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
