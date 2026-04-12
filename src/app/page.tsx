import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white font-sans selection:bg-[#7c63f5] selection:text-white">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto border-b border-[#2a2a40]/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c63f5] to-[#5b43cb] flex items-center justify-center font-bold text-lg shadow-lg shadow-[#7c63f5]/20">
            T
          </div>
          <span className="text-xl font-bold tracking-tight">TaxiFlow<span className="text-[#7c63f5]">RDC</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-[#94a3b8] hover:text-white transition-colors">
            Se connecter
          </Link>
          <Link href="/login" className="px-5 py-2.5 bg-[#7c63f5] hover:bg-[#9580ff] rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-[#7c63f5]/20">
            Espace Membre
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="px-6 md:px-12 max-w-7xl mx-auto pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7c63f5]/10 text-[#7c63f5] border border-[#7c63f5]/20 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-[#7c63f5] animate-pulse"></span>
            100% Adapté à Kinshasa
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6">
            Sécurisez votre flotte de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c63f5] to-[#4ade80]">taxis Ketch</span>.
          </h1>
          <p className="text-lg md:text-xl text-[#94a3b8] mb-10 leading-relaxed">
            La première plateforme Fintech congolaise qui réconcilie les versements Mobile Money, évalue la fiabilité des chauffeurs et garantit la transparence de vos contrats Location-Vente.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-[#7c63f5] hover:bg-[#9580ff] rounded-2xl text-lg font-bold transition-all shadow-xl shadow-[#7c63f5]/25 hover:scale-105">
              Démarrer avec ma flotte
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-[#12121e] border border-[#2a2a40] hover:border-[#64748b] rounded-2xl text-lg font-bold transition-all text-[#94a3b8] hover:text-white">
              Découvrir le Dashboard
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-[#12121e] border border-[#2a2a40] rounded-3xl p-8 hover:border-[#7c63f5]/50 transition-colors">
            <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Revenus Sécurisés</h3>
            <p className="text-[#64748b] leading-relaxed">
              Synchronisation directe avec les versements M-Pesa, Airtel et Orange Money. Fini les pertes liées au cash et les calculs de taux de change laborieux.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#12121e] border border-[#2a2a40] rounded-3xl p-8 hover:border-[#7c63f5]/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#7c63f5]/5 blur-3xl rounded-full"></div>
            <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">Trust Score Chauffeur</h3>
            <p className="text-[#64748b] leading-relaxed">
              Un système de points automatique pénalise les retards et récompense la ponctualité. Identifiez vos meilleurs chauffeurs en un coup d'œil (Badges Or, Bleu, Rouge).
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#12121e] border border-[#2a2a40] rounded-3xl p-8 hover:border-[#7c63f5]/50 transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">100% Offline-First</h3>
            <p className="text-[#64748b] leading-relaxed">
              Conçu pour les réalités du réseau congolais. Le chauffeur saisit sa recette même en zone blanche, la synchronisation se fait dès le retour de la 4G.
            </p>
          </div>
        </div>
      </main>

      {/* Footer minimaliste */}
      <footer className="border-t border-[#2a2a40] py-8 text-center text-[#64748b] text-sm">
        <p>© 2026 TaxiFlow RDC. Développé pour la mobilité kinoise.</p>
      </footer>
    </div>
  );
}
