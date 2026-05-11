import { Bike, CarTaxiFront, MapPin, Wrench } from "lucide-react";

const vehicles = [
  { name: "Taxi Toyota Noah", plate: "KN 4215 AB", type: "taxi", driver: "Jean Mbuyi", status: "En service", zone: "Gombe", revenue: "320,000 FC" },
  { name: "Moto Boxer 150", plate: "KN 8831 MC", type: "moto", driver: "Patrick Ilunga", status: "En service", zone: "Kasa-Vubu", revenue: "145,000 FC" },
  { name: "Taxi Hiace", plate: "KN 1902 TX", type: "taxi", driver: "Cedric Kabongo", status: "Repos", zone: "Limete", revenue: "275,000 FC" },
  { name: "Moto TVS", plate: "KN 5520 MT", type: "moto", driver: "Grace Makiese", status: "Maintenance", zone: "Bandal", revenue: "98,000 FC" }
];

export default function InvestorFleetPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-palm dark:text-emerald-300">Actifs suivis</p>
        <h1 className="mt-1 text-3xl font-semibold">Etat de la Flotte</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {vehicles.map((vehicle) => {
          const Icon = vehicle.type === "moto" ? Bike : CarTaxiFront;
          const isMaintenance = vehicle.status === "Maintenance";

          return (
            <article key={vehicle.plate} className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-stone-800 dark:bg-stone-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{vehicle.name}</h2>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Plaque {vehicle.plate}</p>
                </div>
                <span className="rounded-md bg-palm/10 p-2 text-palm dark:text-emerald-300">
                  <Icon size={22} aria-hidden />
                </span>
              </div>

              <dl className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500 dark:text-stone-400">Chauffeur</dt>
                  <dd className="font-semibold">{vehicle.driver}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="inline-flex items-center gap-2 text-stone-500 dark:text-stone-400">
                    <MapPin size={15} aria-hidden />
                    Zone
                  </dt>
                  <dd className="font-semibold">{vehicle.zone}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500 dark:text-stone-400">Revenu mois</dt>
                  <dd className="font-semibold">{vehicle.revenue}</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className={`rounded-md px-3 py-2 text-sm font-semibold ${isMaintenance ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                  {vehicle.status}
                </span>
                {isMaintenance ? (
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                    <Wrench size={16} aria-hidden />
                    Controle requis
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
