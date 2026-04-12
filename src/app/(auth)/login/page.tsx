'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Assure-toi que ce chemin correspond bien à ton fichier d'initialisation Supabase
import { createClient } from '@/lib/supabase/client'; 

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient(); // Initialisation de Supabase

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const[errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Voici la fonction ASYNCHRONE qui englobe l'inscription
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault(); // Empêche le rechargement de la page
    setLoading(true);
    setErrorMsg('');

    // 1. L'appel propre à Supabase (sans la partie qui créait le doublon)
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          role: 'owner', // ou 'driver' selon ton besoin
        },
      },
    });

    // 2. Gestion du résultat
    if (error) {
      setErrorMsg("Erreur : " + error.message);
      setLoading(false);
    } else {
      // Succès ! Le compte est créé et le trigger a fait son travail.
      // On redirige vers l'overview.
      router.push('/overview'); 
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white flex flex-col items-center justify-center p-4 font-sans">
      
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c63f5] to-[#5b43cb] flex items-center justify-center font-bold text-lg">
            T
          </div>
          <span className="text-xl font-bold">taxiflow</span>
        </div>
        <p className="text-[#64748b] text-sm">Commencez à gérer votre flotte</p>
      </div>

      <div className="bg-[#12121e] border border-[#2a2a40] rounded-2xl p-6 md:p-8 w-full max-w-md shadow-xl shadow-[#7c63f5]/5">
        <h2 className="text-xl font-bold mb-6">Créer un compte</h2>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-sm mb-6">
            {errorMsg}
          </div>
        )}

        {/* ✅ Le formulaire est relié à la fonction handleSignUp */}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">Nom complet</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required 
              className="w-full bg-[#0a0a14] border border-[#2a2a40] rounded-xl px-4 py-3 text-sm focus:border-[#7c63f5] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="w-full bg-[#0a0a14] border border-[#2a2a40] rounded-xl px-4 py-3 text-sm focus:border-[#7c63f5] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              className="w-full bg-[#0a0a14] border border-[#2a2a40] rounded-xl px-4 py-3 text-sm focus:border-[#7c63f5] outline-none transition-colors"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#7c63f5] hover:bg-[#9580ff] text-white font-semibold py-3 rounded-xl transition-colors mt-4 disabled:opacity-50"
          >
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-xs text-[#64748b] mt-6">
          Déjà un compte ? <span className="text-[#7c63f5] cursor-pointer hover:underline">Se connecter</span>
        </p>
      </div>
    </div>
  );
}
