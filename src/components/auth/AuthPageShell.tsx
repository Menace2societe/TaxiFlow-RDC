import Link from "next/link";
import { CarTaxiFront, TrendingUp, Shield, Users } from "lucide-react";
import { ROUTES } from "@/lib/routes";

const features = [
  {
    icon: TrendingUp,
    title: "Revenus en temps réel",
    desc: "Suivez chaque versement de vos chauffeurs, heure par heure."
  },
  {
    icon: Shield,
    title: "Validation sécurisée",
    desc: "Chaque paiement est approuvé par l'investisseur avant confirmation."
  },
  {
    icon: Users,
    title: "Gestion de flotte",
    desc: "Assignez, suivez et contrôlez l'état de chaque véhicule."
  }
];

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-950">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 md:grid-cols-[1fr_1fr] xl:grid-cols-[1.1fr_0.9fr]">

        {/* ── Sidebar gauche ── */}
        <aside className="hidden md:flex md:flex-col md:justify-between relative overflow-hidden border-r border-neutral-800/50 bg-gradient-to-br from-emerald-950/80 via-neutral-950 to-neutral-950 px-10 py-12 text-white">
          {/* Radial glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.12)_0%,_transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.06)_0%,_transparent_60%)]" />

          {/* Logo */}
          <Link href={ROUTES.HOME} className="relative flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 transition-all group-hover:bg-emerald-500/30">
              <CarTaxiFront size={18} className="text-emerald-400" />
            </div>
            <span className="text-lg font-bold tracking-tight">TaxiFlow <span className="text-emerald-400">RDC</span></span>
          </Link>

          {/* Hero text */}
          <div className="relative space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">Kinshasa · RDC</p>
              <h1 className="text-4xl font-bold leading-tight text-white">
                Gérez votre flotte.<br />
                <span className="text-emerald-400">Augmentez</span> vos revenus.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-neutral-400">
                La plateforme moderne pour propriétaires de taxis et chauffeurs à Kinshasa.
                Versements, pannes et performance — tout en un seul endroit.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Icon size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-neutral-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stat */}
          <div className="relative flex items-center gap-6 rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-5 py-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">500+</p>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">Véhicules</p>
            </div>
            <div className="h-10 w-px bg-neutral-800" />
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">24/7</p>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">Suivi</p>
            </div>
            <div className="h-10 w-px bg-neutral-800" />
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">100%</p>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">Mobile</p>
            </div>
          </div>
        </aside>

        {/* ── Contenu form ── */}
        <section className="flex items-center justify-center bg-neutral-950 px-5 py-10">
          <div className="w-full max-w-md">{children}</div>
        </section>

      </div>
    </main>
  );
}
