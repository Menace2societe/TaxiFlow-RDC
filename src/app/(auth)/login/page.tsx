"use client";
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/overview` } });

    if (error) {
      alert(error.message);
    } else {
      if (isLogin) router.push('/overview');
      else alert("Compte créé ! Vérifiez vos emails (si activé) ou contactez l'admin.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 p-8 rounded-[32px] shadow-2xl">
        <h1 className="text-3xl font-black text-white mb-2 italic">TAXIFLOW RDC</h1>
        <p className="text-zinc-400 mb-8">{isLogin ? "Heureux de vous revoir." : "Commencez votre gestion ici."}</p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-[#7c63f5]" />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-[#7c63f5]" />
          <button type="submit" disabled={loading} className="w-full bg-[#7c63f5] text-white font-black py-4 rounded-2xl hover:bg-[#6a52e0] transition-all">
            {loading ? "Chargement..." : isLogin ? "SE CONNECTER" : "CRÉER UN COMPTE"}
          </button>
        </form>
        
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-zinc-500 text-sm hover:text-white transition-colors">
          {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </div>
  );
}
