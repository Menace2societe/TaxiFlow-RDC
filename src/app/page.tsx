import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  Bike,
  Camera,
  CarTaxiFront,
  Check,
  FileSignature,
  Gauge,
  Smartphone,
  TrendingUp,
  WifiOff
} from "lucide-react";
import { getCurrentProfile, getRoleHome } from "@/lib/auth/roles";
import { FREE_VEHICLES, PRICE_PER_VEHICLE_USD, TRIAL_DAYS, VOLUME_DISCOUNTS, monthlyQuote } from "@/lib/billing/plans";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "TaxiFlow RDC — Suivez les recettes de vos taxis et motos",
  description:
    "Versements Mobile Money, contrôle kilométrique anti-fraude, bénéfice net par véhicule et location-vente. 1 véhicule gratuit, 30 jours d'essai."
};

const features = [
  {
    icon: Smartphone,
    title: "Versements par Mobile Money",
    text: "Le chauffeur paie par M-Pesa, Airtel Money ou Orange Money. Le versement est validé dès que l'argent arrive."
  },
  {
    icon: Gauge,
    title: "Courses cachées détectées",
    text: "Le compteur ne ment pas : les kilomètres roulés sans recette et les recettes trop faibles sont signalés."
  },
  {
    icon: Camera,
    title: "Photo du compteur",
    text: "Chaque versement arrive avec la photo du compteur. Vous tranchez : justifié ou fraude."
  },
  {
    icon: TrendingUp,
    title: "Bénéfice net par véhicule",
    text: "Recettes moins carburant, entretien et réparations : vous savez quel véhicule rapporte vraiment."
  },
  {
    icon: FileSignature,
    title: "Location-vente suivie",
    text: "Combien le chauffeur a déjà remboursé, combien il reste, et quand il sera propriétaire."
  },
  {
    icon: BellRing,
    title: "Alertes WhatsApp",
    text: "Assurance ou contrôle technique qui expire, recette suspecte : un message chaque matin."
  },
  {
    icon: WifiOff,
    title: "Marche sans réseau",
    text: "L'application s'installe sur le téléphone. Sans réseau, le versement est gardé puis envoyé."
  }
];

const steps = [
  { title: "Créez votre compte", text: `Gratuit, en 2 minutes. ${TRIAL_DAYS} jours d'essai sans engagement.` },
  { title: "Ajoutez vos véhicules et chauffeurs", text: "Un numéro de téléphone suffit : le chauffeur reçoit un code pour se connecter." },
  { title: "Suivez chaque jour", text: "Versements, kilomètres, alertes et bénéfice, depuis votre téléphone." }
];

const faq = [
  {
    question: "Mes chauffeurs n'ont pas d'email, ça marche ?",
    answer: "Oui. Vous les inscrivez avec leur numéro +243, ils se connectent avec ce numéro et un code."
  },
  {
    question: "Et si le chauffeur n'a pas de réseau ?",
    answer: "Il déclare quand même : le versement est gardé dans son téléphone et part dès que le réseau revient."
  },
  {
    question: "Comment je paie l'abonnement ?",
    answer: "Par M-Pesa, Airtel Money ou Orange Money, en USD ou en CDF au taux du jour. Ou en espèces auprès de notre équipe."
  },
  {
    question: "Qui voit mes données ?",
    answer: "Vous seul, et chaque chauffeur pour son propre véhicule. Les documents sont privés et les numéros ne sont pas partagés."
  }
];

// Exemple affiché : 5 taxis → 1 offert, 4 payants.
const exampleQuote = monthlyQuote(["taxi", "taxi", "taxi", "taxi", "taxi"]);

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(getRoleHome(profile.role));
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b1210] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(circle_at_top_left,rgba(31,122,85,0.32),transparent_45%),linear-gradient(135deg,rgba(14,116,144,0.16),transparent_50%)]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <nav className="flex items-center justify-between py-5">
          <Link href={ROUTES.HOME} className="inline-flex items-center gap-2 text-lg font-bold">
            <Image src="/icons/icon.svg" alt="" width={28} height={28} unoptimized className="rounded-lg" />
            TaxiFlow RDC
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <a href="#tarifs" className="hidden rounded-md px-3 py-2 text-white/75 hover:text-white sm:block">
              Tarifs
            </a>
            <Link href={ROUTES.LOGIN} className="rounded-md border border-white/15 px-3 py-2 font-semibold text-white/85 hover:bg-white/10">
              Connexion
            </Link>
          </div>
        </nav>

        {/* ── Promesse ── */}
        <section className="grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="mb-4 inline-flex rounded-md border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-sm font-medium text-emerald-100">
              Pour les propriétaires de taxis et motos-taxis en RDC
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Sachez enfin ce que rapporte chaque taxi et chaque moto.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/70">
              Versements par Mobile Money, kilomètres contrôlés, photo du compteur : TaxiFlow vous montre quand un chauffeur
              cache des courses, et combien chaque véhicule vous rapporte vraiment.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={ROUTES.REGISTER} className="btn-primary min-h-12 px-6 text-base">
                Essayer {TRIAL_DAYS} jours gratuits
              </Link>
              <a href="#tarifs" className="btn-secondary min-h-12 border-white/20 bg-white/10 px-6 text-base text-white hover:bg-white/15 dark:border-white/20 dark:bg-white/10 dark:text-white">
                Voir les tarifs
              </a>
            </div>
            <p className="mt-3 text-sm text-white/50">{FREE_VEHICLES} véhicule gratuit pour toujours · sans carte bancaire</p>
          </div>

          {/* Exemple d'écran : ce que voit l'investisseur */}
          <figure className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/30">
            <figcaption className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/45">Exemple d&apos;alerte</figcaption>
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="flex items-center gap-2 font-semibold text-amber-100">
                  <Gauge size={16} aria-hidden /> 80 km roulés sans recette
                </p>
                <p className="mt-1 text-sm text-amber-100/70">Toyota Ist · le compteur a avancé pendant la nuit, aucun versement déclaré.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="flex items-center gap-2 font-semibold">
                  <Camera size={16} aria-hidden /> Recette suspecte
                </p>
                <p className="mt-1 text-sm text-white/60">Moto TVS · 92 km pour 4 000 FC · photo du compteur jointe</p>
                <div className="mt-3 flex gap-2 text-xs font-semibold">
                  <span className="rounded-md border border-emerald-500/40 px-2.5 py-1 text-emerald-300">Justifiée</span>
                  <span className="rounded-md border border-red-500/40 px-2.5 py-1 text-red-300">Fraude</span>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="flex items-center gap-2 font-semibold text-emerald-100">
                  <Smartphone size={16} aria-hidden /> Versement reçu par M-Pesa
                </p>
                <p className="mt-1 text-sm text-emerald-100/70">Validé automatiquement à la réception.</p>
              </div>
            </div>
          </figure>
        </section>

        {/* ── Fonctionnalités ── */}
        <section className="py-12" aria-labelledby="features-title">
          <h2 id="features-title" className="text-3xl font-semibold">
            Tout ce qu&apos;il faut pour piloter votre flotte
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <span className="inline-flex rounded-lg bg-emerald-400/10 p-2.5 text-emerald-300">
                  <Icon size={20} aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Comment ça marche ── */}
        <section className="py-12" aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-3xl font-semibold">
            Prêt en 3 étapes
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <span className="text-sm font-bold text-emerald-300">Étape {index + 1}</span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Tarifs ── */}
        <section id="tarifs" className="scroll-mt-6 py-12" aria-labelledby="pricing-title">
          <h2 id="pricing-title" className="text-3xl font-semibold">
            Tarifs simples, par véhicule
          </h2>
          <p className="mt-2 text-white/60">
            {TRIAL_DAYS} jours d&apos;essai, puis paiement mensuel par Mobile Money. Sans engagement.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-emerald-400/40 bg-emerald-400/[0.06] p-6">
              <p className="font-semibold text-emerald-200">Découverte</p>
              <p className="mt-3 text-4xl font-semibold">Gratuit</p>
              <p className="mt-1 text-sm text-white/55">pour {FREE_VEHICLES} véhicule, sans limite de durée</p>
              <ul className="mt-5 space-y-2 text-sm text-white/75">
                {["Toutes les fonctionnalités", "Versements, alertes et Mobile Money inclus", "Idéal pour essayer"].map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden /> {item}
                  </li>
                ))}
              </ul>
            </article>
            {(
              [
                { kind: "moto", icon: Bike, title: "Moto-taxi" },
                { kind: "taxi", icon: CarTaxiFront, title: "Taxi" }
              ] as const
            ).map(({ kind, icon: Icon, title }) => (
              <article key={kind} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <p className="flex items-center gap-2 font-semibold text-white/85">
                  <Icon size={18} aria-hidden /> {title}
                </p>
                <p className="mt-3 text-4xl font-semibold">
                  {PRICE_PER_VEHICLE_USD[kind]} $<span className="text-base font-normal text-white/55"> / mois</span>
                </p>
                <p className="mt-1 text-sm text-white/55">par véhicule supplémentaire, payable en CDF</p>
                <ul className="mt-5 space-y-2 text-sm text-white/75">
                  {VOLUME_DISCOUNTS.slice()
                    .reverse()
                    .map((tier) => (
                      <li key={tier.minVehicles} className="flex gap-2">
                        <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden /> -{tier.percent} % dès{" "}
                        {tier.minVehicles} véhicules
                      </li>
                    ))}
                  <li className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden /> 12 mois payés 10
                  </li>
                </ul>
              </article>
            ))}
          </div>

          <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/70">
            Exemple : avec {exampleQuote.vehicles} taxis, {exampleQuote.freeVehicles} est offert et vous payez{" "}
            <strong className="text-white">{exampleQuote.totalUsd} $ par mois</strong> pour les {exampleQuote.billableVehicles}{" "}
            autres.
          </p>
        </section>

        {/* ── Questions ── */}
        <section className="py-12" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-3xl font-semibold">
            Questions fréquentes
          </h2>
          <div className="mt-6 divide-y divide-white/10 rounded-xl border border-white/10">
            {faq.map((item) => (
              <details key={item.question} className="group px-5 py-4">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm leading-6 text-white/65">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="py-12 text-center">
          <h2 className="text-3xl font-semibold">Commencez aujourd&apos;hui</h2>
          <p className="mt-2 text-white/60">
            {TRIAL_DAYS} jours gratuits, {FREE_VEHICLES} véhicule gratuit pour toujours.
          </p>
          <Link href={ROUTES.REGISTER} className="btn-primary mt-6 inline-flex min-h-12 px-6 text-base">
            Créer mon compte gratuit
          </Link>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-8 text-sm text-white/45 sm:flex-row">
          <p>© {new Date().getFullYear()} TaxiFlow RDC</p>
          <nav className="flex gap-4">
            <Link href={ROUTES.TERMS} className="hover:text-white">
              Conditions d&apos;utilisation
            </Link>
            <Link href={ROUTES.PRIVACY} className="hover:text-white">
              Confidentialité
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
