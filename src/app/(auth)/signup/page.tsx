"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Création de l'utilisateur dans Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Insertion manuelle dans la table 'profiles' (Ce qui manquait !)
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: data.user.id,
            full_name: fullName,
            role: "investor",
          },
        ]);

      if (profileError) {
        console.error("Erreur Profil:", profileError);
        setError("Erreur base de données : " + profileError.message);
        setLoading(false);
        return;
      }
    }

    // 3. Succès : Redirection vers le dashboard
    router.push("/overview");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#7c63f5] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-xl font-bold text-white">taxiflow</span>
          </div>
          <p className="text-[#64748b] text-sm">Commencez à gérer votre flotte</p>
        </div>

        <div className="bg-[#12121e] border border-[#2a2a40] rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-5 text-white">Créer un compte</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Nom complet
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Jean Mukeba"
                className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white placeholder:text-[#3a3a55] focus:outline-none focus:border-[#7c63f5] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vous@exemple.com"
                className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white placeholder:text-[#3a3a55] focus:outline-none focus:border-[#7c63f5] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full px-3 py-2.5 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white placeholder:text-[#3a3a55] focus:outline-none focus:border-[#7c63f5] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#7c63f5] hover:bg-[#9580ff] disabled:opacity-60 rounded-xl text-sm font-semibold text-white transition-colors"
            >
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-sm text-[#64748b] mt-5">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-[#7c63f5] hover:text-[#9580ff] font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
