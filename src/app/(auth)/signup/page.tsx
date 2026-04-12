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

    try {
      // 1. Création du compte (Auth)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      // 2. Enregistrement du profil dans la table SQL 'profiles'
      if (data?.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              id: data.user.id,
              full_name: fullName,
              role: "investor",
            },
          ]);

        if (profileError) throw profileError;
      }

      // 3. Redirection si tout est OK
      router.push("/overview");
      router.refresh();

    } catch (err: any) {
      // On affiche l'erreur exacte pour savoir ce qui bloque
      console.error("Erreur Inscription:", err);
      setError(err.message || "Une erreur est survenue lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#7c63f5] rounded-xl flex items-center justify-center shadow-lg shadow-[#7c63f5]/20">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">taxiflow</span>
          </div>
          <p className="text-[#64748b] text-sm">Gérez votre business de taxi à Kinshasa</p>
        </div>

        <div className="bg-[#12121e] border border-[#2a2a40] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 text-white text-center">Créer un compte</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Ex: Jonathan Kamunga"
                className="w-full px-4 py-3 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white focus:outline-none focus:border-[#7c63f5] focus:ring-1 focus:ring-[#7c63f5] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre@email.com"
                className="w-full px-4 py-3 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white focus:outline-none focus:border-[#7c63f5] focus:ring-1 focus:ring-[#7c63f5] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full px-4 py-3 bg-[#0a0a14] border border-[#2a2a40] rounded-xl text-sm text-white focus:outline-none focus:border-[#7c63f5] focus:ring-1 focus:ring-[#7c63f5] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#7c63f5] hover:bg-[#6a51e6] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white transition-all transform active:scale-[0.98] shadow-lg shadow-[#7c63f5]/20"
            >
              {loading ? "Création en cours..." : "Lancer mon activité"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#2a2a40] text-center">
            <p className="text-sm text-[#64748b]">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-[#7c63f5] hover:text-[#9580ff] font-semibold transition-colors">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
