import type { Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, ChevronDown, Send } from "lucide-react";
import { LicensePlate, PlateChip, StateMark } from "@/components/driver/plate";
import { getCurrentProfile, getRoleHome } from "@/lib/auth/roles";
import { FREE_VEHICLES, PRICE_PER_VEHICLE_USD, TRIAL_DAYS, VOLUME_DISCOUNTS, monthlyQuote } from "@/lib/billing/plans";
import { SUSPICIOUS_DISTANCE_KM, SUSPICIOUS_MAX_DECLARED_CDF } from "@/lib/entries/metrics";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "TaxiFlow RDC — Suivez les recettes de vos taxis et motos",
  description:
    "Versements Mobile Money, contrôle kilométrique anti-fraude, bénéfice net par véhicule et location-vente. 1 véhicule gratuit, 30 jours d'essai."
};

export const viewport: Viewport = {
  themeColor: "#f7f7f2"
};

/** Exemple affiché sur la route : la soirée d'un propriétaire de 4 véhicules. */
const ownerRows = [
  { plate: "1307KN01", who: "Héritier · 61\u00a0km", amount: 20000 },
  { plate: "0592LS01", who: "Glody · 70\u00a0km", amount: 58500 }
];

const steps = [
  { title: "Créez votre compte", text: `Gratuit, en 2 minutes. ${TRIAL_DAYS} jours d'essai sans engagement.` },
  { title: "Ajoutez vos véhicules et chauffeurs", text: "Un numéro +243 suffit : le chauffeur reçoit un code pour se connecter, sans email." },
  { title: "Chaque soir, regardez", text: "Qui a versé, combien, avec quels kilomètres. Vous validez d'un geste." }
];

const features = [
  {
    title: "Versements par Mobile Money",
    text: "Le chauffeur paie par M-Pesa, Airtel Money ou Orange Money. Le versement est validé dès que l'argent arrive."
  },
  {
    title: "Photo du compteur",
    text: "Chaque versement arrive avec la photo du compteur du soir. Sans photo, il vous est signalé."
  },
  {
    title: "Bénéfice net par véhicule",
    text: "Recettes moins carburant, entretien et réparations : vous savez quel véhicule rapporte vraiment."
  },
  {
    title: "Location-vente suivie",
    text: "Combien le chauffeur a déjà remboursé, combien il reste, et quand le véhicule sera à lui."
  },
  {
    title: "Alertes WhatsApp",
    text: "Assurance ou contrôle technique qui expire, recette suspecte : un message chaque matin, jamais deux fois le même."
  },
  {
    title: "Marche sans réseau",
    text: "L'application s'installe sur le téléphone. Sans réseau, le versement est gardé, puis envoyé au retour de la connexion."
  }
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

/** Montant en FC avec une espace insécable normale : l'espace fine de fr-CD est presque invisible en Barlow. */
function fc(value: number) {
  return `${value.toLocaleString("fr-CD").replace(/\u202f/g, "\u00a0")}\u00a0FC`;
}

function TrialButton({ className = "" }: { className?: string }) {
  return (
    <Link href={ROUTES.REGISTER} className={`btn-primary px-7 no-underline ${className}`}>
      Essayer {TRIAL_DAYS} jours gratuits
    </Link>
  );
}

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(getRoleHome(profile.role));
  }

  return (
    <div className={`plate-world min-h-screen`}>
      <header className="border-b-2 border-plate-ink bg-plate-white">
        <nav className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8" aria-label="Navigation principale">
          <Link href={ROUTES.HOME} className="font-plate text-[26px] font-bold no-underline">
            TaxiFlow RDC
          </Link>
          <div className="flex items-center gap-1 text-[16px] font-semibold sm:gap-6">
            <a href="#comment" className="hidden no-underline hover:underline sm:inline">
              Comment ça marche
            </a>
            <a href="#tarifs" className="hidden no-underline hover:underline sm:inline">
              Tarifs
            </a>
            <Link href={ROUTES.LOGIN} className="btn-secondary min-h-[44px] px-4 no-underline">
              Connexion
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ─── La route d'un versement ─────────────────────────────────────── */}
        <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 lg:pt-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 id="hero-title" className="max-w-[24ch] font-plate text-[clamp(2.6rem,5.2vw,3.75rem)] font-bold leading-[0.98]">
                Ce que votre chauffeur déclare à 18 h, vous le voyez à 18 h 01.
              </h1>
              <p className="mt-4 max-w-[52ch] text-[18px] leading-relaxed">
                Recette, kilomètres et photo du compteur, chaque soir, pour chaque taxi et chaque moto. TaxiFlow vous montre qui a
                versé, qui cache des courses, et ce que chaque véhicule vous laisse.
              </p>
            </div>
            <div className="shrink-0 lg:text-right">
              <TrialButton className="w-full sm:w-auto" />
              <p className="mt-2 text-[15px] font-medium">
                {FREE_VEHICLES} véhicule gratuit pour toujours · sans carte bancaire
              </p>
            </div>
          </div>

          <figure className="mt-10 lg:mt-8">
            <div className="grid items-center gap-0 lg:grid-cols-[280px_1fr_440px]">
              {/* Côté chauffeur */}
              <div className="mx-auto w-full max-w-[300px] rounded-[30px] border-[3px] border-plate-ink bg-plate-ground p-4 lg:mx-0">
                <p className="mb-3 text-center text-[13px] font-semibold">Téléphone de Patrick, chauffeur</p>
                <LicensePlate plateNumber="4821BK01" size="sm" />
                <dl className="mt-3 grid gap-2 text-[14px] font-semibold">
                  {[
                    ["Montant", "55 000 FC"],
                    ["Compteur du matin", "84 210 km"],
                    ["Compteur du soir", "84 362 km"]
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd className="mt-1 rounded-lg border-2 border-plate-ink bg-plate-white px-3 py-1.5 font-plate text-[21px] font-bold">
                        {value}
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt>Photo du compteur</dt>
                    <dd className="mt-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-plate-ink py-2.5">
                      <Camera size={16} aria-hidden /> Photo prise
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-plate-band py-3 text-[15px] font-bold text-plate-white">
                  <Send size={16} aria-hidden /> Envoyer mon versement
                </p>
              </div>

              {/* La route */}
              <div className="route relative mx-auto h-28 w-[6px] bg-plate-ink lg:mx-0 lg:h-[6px] lg:w-auto" aria-hidden>
                <span className="absolute left-1/2 top-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-plate-ink lg:left-0 lg:top-1/2" />
                <span className="absolute bottom-0 left-1/2 h-6 w-6 -translate-x-1/2 translate-y-1/2 rounded-full bg-plate-ink lg:bottom-auto lg:left-auto lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-1/2" />
                <span className="route-chip absolute left-1/2 top-1/2 whitespace-nowrap rounded-lg border-2 border-plate-ink bg-plate-white px-3 py-1.5 text-[14px] font-semibold">
                  Patrick · 152 km
                  <b className="block font-plate text-[22px] leading-tight">55 000 FC</b>
                </span>
              </div>

              {/* Côté propriétaire */}
              <div className="rounded-2xl border-2 border-plate-ink bg-plate-white p-4 sm:p-5">
                <p className="mb-3 text-[13px] font-semibold">Votre écran, propriétaire</p>
                <div className="rounded-xl bg-plate-vignette px-4 py-3.5">
                  <p className="font-plate text-[34px] font-bold leading-none">3 sur 4 ont déclaré</p>
                  <p className="mt-1.5 text-[15px]">Dimanche · 133 500 FC sur 151 000 FC attendus</p>
                </div>
                <ul className="mt-2 text-[15px] font-semibold">
                  <li className="route-arrive flex items-center justify-between gap-3 border-t-2 border-plate-rule py-2.5 first:border-t-0">
                    <PlateChip plateNumber="4821BK01" />
                    <span className="flex min-w-0 flex-1 items-center gap-2 leading-tight">
                      <StateMark state="ok" />
                      <span>Patrick · 152&nbsp;km</span>
                    </span>
                    <span className="whitespace-nowrap font-plate text-[21px] font-bold">{fc(55000)}</span>
                  </li>
                  {ownerRows.map((row) => (
                    <li key={row.plate} className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-2.5">
                      <PlateChip plateNumber={row.plate} />
                      <span className="flex min-w-0 flex-1 items-center gap-2 leading-tight">
                        <StateMark state="ok" />
                        <span>{row.who}</span>
                      </span>
                      <span className="whitespace-nowrap font-plate text-[21px] font-bold">{fc(row.amount)}</span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-3 border-t-2 border-plate-rule py-2.5 text-plate-soft">
                    <PlateChip plateNumber="7740KN01" />
                    <span className="flex min-w-0 flex-1 items-center gap-2 leading-tight">
                      <StateMark state="none" />
                      Rien encore
                    </span>
                    <span className="font-plate text-[21px] font-bold">—</span>
                  </li>
                </ul>
              </div>
            </div>
            <figcaption className="mt-4 text-[14px] font-medium text-plate-soft">
              Exemple : chauffeurs, plaques et montants inventés pour la démonstration.
            </figcaption>
          </figure>
        </section>

        {/* ─── Le compteur ne ment pas ─────────────────────────────────────── */}
        <section aria-labelledby="fraud-title" className="border-y-2 border-plate-ink bg-plate-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_520px] lg:items-center">
            <div>
              <h2 id="fraud-title" className="font-plate text-[clamp(2rem,4vw,3rem)] font-bold leading-none">
                Le compteur ne ment pas.
              </h2>
              <p className="mt-4 max-w-[52ch] text-[18px] leading-relaxed">
                Beaucoup de kilomètres pour une petite recette ? Le compteur qui avance pendant la nuit sans versement ? TaxiFlow
                le signale tout de suite, photo du compteur à l&apos;appui. Vous tranchez : justifié ou fraude.
              </p>
            </div>
            <figure className="rounded-2xl border-2 border-plate-bad p-5">
              <div className="flex flex-wrap items-center gap-3">
                <StateMark state="bad" />
                <PlateChip plateNumber="2214BK01" />
                <span className="text-[16px] font-semibold">Moto TVS · samedi</span>
              </div>
              <p className="mt-3 font-plate text-[34px] font-bold leading-none text-plate-bad">92 km pour 4 000 FC</p>
              <p className="mt-2 text-[15px]">Plus de {SUSPICIOUS_DISTANCE_KM} km pour une recette de {fc(SUSPICIOUS_MAX_DECLARED_CDF)} ou moins. Photo du compteur jointe.</p>
              <p className="mt-4 border-t-2 border-plate-rule pt-3 text-[16px]">
                Vous choisissez : <b>justifiée</b> ou <b className="text-plate-bad">fraude</b>.
              </p>
              <figcaption className="mt-3 text-[14px] font-medium text-plate-soft">Exemple d&apos;alerte</figcaption>
            </figure>
          </div>
        </section>

        {/* ─── Comment ça marche : trois arrêts sur la route ───────────────── */}
        <section id="comment" aria-labelledby="steps-title" className="mx-auto max-w-6xl scroll-mt-4 px-5 py-16 sm:px-8">
          <h2 id="steps-title" className="font-plate text-[clamp(2rem,4vw,3rem)] font-bold leading-none">
            Prêt ce soir, en trois arrêts
          </h2>
          <ol className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
            <span className="absolute bottom-3 left-[21px] top-3 w-[6px] bg-plate-ink md:bottom-auto md:left-0 md:right-0 md:top-[19px] md:h-[6px] md:w-auto" aria-hidden />
            {steps.map((step, index) => (
              <li key={step.title} className="relative pl-16 md:pl-0 md:pt-16">
                <span className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-plate-ink bg-plate-white font-plate text-[24px] font-bold">
                  {index + 1}
                </span>
                <h3 className="font-plate text-[24px] font-bold leading-tight">{step.title}</h3>
                <p className="mt-2 max-w-[40ch] text-[16px] leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ─── Le reste ─────────────────────────────────────────────────────── */}
        <section aria-labelledby="features-title" className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
          <h2 id="features-title" className="font-plate text-[clamp(2rem,4vw,3rem)] font-bold leading-none">
            Et tout le reste de votre flotte
          </h2>
          <dl className="mt-8 grid border-t-2 border-plate-ink md:grid-cols-2 md:gap-x-12">
            {features.map((feature) => (
              <div key={feature.title} className="border-b-2 border-plate-rule py-5">
                <dt className="font-plate text-[24px] font-bold leading-tight">{feature.title}</dt>
                <dd className="mt-1.5 max-w-[52ch] text-[16px] leading-relaxed">{feature.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ─── Tarifs ───────────────────────────────────────────────────────── */}
        <section id="tarifs" aria-labelledby="pricing-title" className="scroll-mt-4 border-y-2 border-plate-ink bg-plate-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_420px]">
            <div>
              <h2 id="pricing-title" className="font-plate text-[clamp(2rem,4vw,3rem)] font-bold leading-none">
                Tarifs simples, par véhicule
              </h2>
              <p className="mt-3 text-[17px]">
                {TRIAL_DAYS} jours d&apos;essai, puis paiement mensuel par Mobile Money, en USD ou en CDF au taux du jour. Sans
                engagement.
              </p>
              <table className="mt-6 w-full text-left text-[17px]">
                <caption className="sr-only">Prix par véhicule et par mois</caption>
                <tbody>
                  <tr className="border-t-2 border-plate-ink">
                    <th scope="row" className="py-4 font-semibold">
                      Premier véhicule
                    </th>
                    <td className="py-4 text-right">
                      <b className="font-plate text-[30px]">Gratuit</b>
                      <span className="block text-[14px]">pour toujours</span>
                    </td>
                  </tr>
                  <tr className="border-t-2 border-plate-rule">
                    <th scope="row" className="py-4 font-semibold">
                      Chaque moto-taxi
                    </th>
                    <td className="py-4 text-right">
                      <b className="font-plate text-[30px]">{PRICE_PER_VEHICLE_USD.moto} $</b> par mois
                    </td>
                  </tr>
                  <tr className="border-y-2 border-plate-rule">
                    <th scope="row" className="py-4 font-semibold">
                      Chaque taxi
                    </th>
                    <td className="py-4 text-right">
                      <b className="font-plate text-[30px]">{PRICE_PER_VEHICLE_USD.taxi} $</b> par mois
                    </td>
                  </tr>
                </tbody>
              </table>
              <ul className="mt-4 space-y-1.5 text-[16px]">
                {VOLUME_DISCOUNTS.slice()
                  .reverse()
                  .map((tier) => (
                    <li key={tier.minVehicles} className="flex items-center gap-2.5">
                      <StateMark state="ok" />−{tier.percent} % dès {tier.minVehicles} véhicules payants
                    </li>
                  ))}
                <li className="flex items-center gap-2.5">
                  <StateMark state="ok" />
                  12 mois payés 10
                </li>
              </ul>
            </div>
            <div className="self-start rounded-2xl bg-plate-vignette p-6">
              <p className="text-[16px] font-semibold">Exemple : {exampleQuote.vehicles} taxis</p>
              <p className="mt-1 font-plate text-[64px] font-bold leading-none">{exampleQuote.totalUsd} $</p>
              <p className="mt-1 text-[17px]">
                par mois : {exampleQuote.freeVehicles} taxi offert, {exampleQuote.billableVehicles} payants.
              </p>
              <TrialButton className="mt-5 w-full" />
            </div>
          </div>
        </section>

        {/* ─── Questions ────────────────────────────────────────────────────── */}
        <section aria-labelledby="faq-title" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 id="faq-title" className="font-plate text-[clamp(2rem,4vw,3rem)] font-bold leading-none">
            Questions fréquentes
          </h2>
          <div className="mt-6 max-w-3xl border-t-2 border-plate-ink">
            {faq.map((item) => (
              <details key={item.question} className="group border-b-2 border-plate-rule">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-[18px] font-semibold [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown size={22} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="pb-4 text-[16px] leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ─── Le bout de la route ──────────────────────────────────────────── */}
        <section aria-labelledby="end-title" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="flex items-center gap-0" aria-hidden>
            <span className="h-[6px] flex-1 bg-plate-ink" />
            <span className="h-6 w-6 rounded-full bg-plate-ink" />
          </div>
          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="end-title" className="font-plate text-[clamp(2.2rem,5vw,3.6rem)] font-bold leading-none">
                Ce soir, vous saurez.
              </h2>
              <p className="mt-3 text-[17px]">
                {TRIAL_DAYS} jours gratuits, {FREE_VEHICLES} véhicule gratuit pour toujours.
              </p>
            </div>
            <Link href={ROUTES.REGISTER} className="btn-primary px-7 no-underline">
              Créer mon compte gratuit
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-plate-ink bg-plate-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[15px] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} TaxiFlow RDC</p>
          <nav className="flex gap-6" aria-label="Informations légales">
            <Link href={ROUTES.TERMS}>Conditions d&apos;utilisation</Link>
            <Link href={ROUTES.PRIVACY}>Confidentialité</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
