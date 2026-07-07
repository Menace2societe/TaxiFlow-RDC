import Link from "next/link";
import { redirect } from "next/navigation";
import { Car, ShieldCheck, TrendingUp } from "lucide-react";
import { getCurrentProfile, getRoleHome } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";

const benefits = [
  {
    title: "Proprietaires",
    description: "Suivez les recettes, les statuts et la performance de chaque taxi ou moto en temps reel.",
    icon: Car
  },
  {
    title: "Chauffeurs",
    description: "Declarez vos recettes journalieres avec un parcours simple, lisible et adapte au terrain.",
    icon: ShieldCheck
  },
  {
    title: "Investisseurs",
    description: "Visualisez les rendements, la flotte active et les indicateurs qui comptent pour votre capital.",
    icon: TrendingUp
  }
];

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (profile) {
    const targetPath = getRoleHome(profile.role);
    console.log(`[HOME] Authenticated role detected: ${profile.role}. Redirect target: ${targetPath}.`);
    redirect(targetPath);
  }

  console.log("[HOME] No authenticated profile. Rendering public landing page.");

  return (
    <main className="min-h-screen overflow-hidden bg-[#0b1210] text-white">
      <section className="relative px-5 py-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(31,122,85,0.32),transparent_34%),linear-gradient(135deg,rgba(14,116,144,0.18),transparent_42%)]" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col">
          <nav className="flex items-center justify-between">
            <Link href={ROUTES.HOME} className="text-lg font-bold tracking-normal">
              TaxiFlow RDC
            </Link>
            <Link href={ROUTES.LOGIN} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10">
              Portail
            </Link>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex rounded-md border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm font-medium text-emerald-100">
                Gestion flotte, recettes et rendements a Kinshasa
              </p>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Simplifiez la gestion de votre flotte a Kinshasa
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                TaxiFlow-RDC connecte proprietaires, chauffeurs et investisseurs dans une plateforme unique pour suivre les recettes, la maintenance et la rentabilite de chaque taxi ou moto.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={ROUTES.LOGIN} className="btn-primary min-h-12 px-5">
                  Acceder a mon Portail
                </Link>
                <Link href={ROUTES.REGISTER} className="btn-secondary min-h-12 border-white/20 bg-white/10 px-5 text-white hover:bg-white/15 dark:border-white/20 dark:bg-white/10 dark:text-white">
                  Devenir partenaire
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <article key={benefit.title} className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur">
                    <div className="flex items-start gap-4">
                      <span className="rounded-md bg-emerald-300/12 p-3 text-emerald-200">
                        <Icon size={24} aria-hidden />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold">{benefit.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-white/65">{benefit.description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
