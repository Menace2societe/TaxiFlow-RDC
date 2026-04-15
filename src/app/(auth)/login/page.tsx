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
  const router = useRouter();

  const supabase = createClientComponentClient({
    supabaseUrl: "https://dqswjpktzcdikmwwxokb.supabase.co",
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc3dqcGt0emNkaW13d3hva2IiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNzQ1ODU1OSwiZXhwIjoyMDUzMDM0NTU5fQ.L-uT9uYm9eY6Xk7z6k6_u9_p8_P_u9_p8_P_u9_p8"
  });
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isLogin) {
        // CONNEXION
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Redirection immédiate
        router.push('/overview');
        router.refresh();
      } else {
        // INSCRIPTION
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
        });
        if (error) throw error;
        
        alert("Compte créé ! Vous pouvez maintenant vous connecter.");
        setIsLogin(true); // Bascule automatiquement sur l'écran de connexion
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 p-8 rounded-[32px] shadow-2xl">
        <h1 className="text-3xl font-black text-white mb-2 italic tracking-tighter text-center">TAXIFLOW RDC</h1>
        <p className="text-zinc-400 mb-8 text-center font-medium">
          {isLogin ? "Heureux de vous revoir." : "Commencez votre gestion ici."}
        </p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
             <label className="text-[10px] font-bold text-zinc-600 uppercase ml-2">Email</label>
             <input type="email" placeholder="nom@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-[#7c63f5] transition-all" required />
          </div>
          
          <div className="space-y-1">
             <label className="text-[10px] font-bold text-zinc-600 uppercase ml-2">Mot de passe</label>
             <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-[#7c63f5] transition-all" required />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all mt-4 shadow-lg disabled:opacity-50">
            {loading ? "PATIENTEZ..." : isLogin ? "SE CONNECTER" : "CRÉER UN COMPTE"}
          </button>
        </form>
        
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-zinc-500 text-sm font-bold hover:text-white transition-colors">
          {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </div>
  );
}
