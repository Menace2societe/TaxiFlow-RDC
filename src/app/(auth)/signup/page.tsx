"use client";
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClientComponentClient({
    supabaseUrl: "https://dqswjpktzcdikmwwxokb.supabase.co",
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3dqcGt0emNkaWttd3d4b2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzI5MjEsImV4cCI6MjA5MTI0ODkyMX0.DE8bO0qvXN7d5jUIYzVGN-_z4nCBioNaZ5VFP1t28ls"
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signupError) throw signupError;

      if (data) {
        router.push("/login?message=Check your email to confirm your account");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md space-y-8 bg-zinc-950 border border-zinc-900 p-10 rounded-[32px] shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black italic tracking-tighter">TAXIFLOW RDC</h1>
          <p className="text-zinc-500 font-medium">Créez votre compte administrateur</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm font-bold text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-500 uppercase ml-2">Nom Complet</label>
            <input
              type="text"
              placeholder="Ex: Jonathan Kamunga"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-[#7c63f5] transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-500 uppercase ml-2">Email</label>
            <input
              type="email"
              placeholder="nom@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-[#7c63f5] transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-500 uppercase ml-2">Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-[#7c63f5] transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-zinc-200 transition-all text-lg shadow-lg disabled:opacity-50"
          >
            {loading ? "CRÉATION EN COURS..." : "S'INSCRIRE"}
          </button>
        </form>

        <p className="text-center text-zinc-500 font-bold text-sm">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-[#7c63f5] hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
