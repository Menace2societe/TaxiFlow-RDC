import Link from "next/link";
import { Bike, CarTaxiFront, Eye, Filter, MapPin, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const vehicles = [
  { id: "veh-001", name: "Taxi Toyota Noah", plate: "KN 4215 AB", type: "taxi", driver: "Jean Mbuyi", status: "En service", zone: "Gombe", revenue: "320,000 FC", trips: 42 },
  { id: "veh-002", name: "Moto Boxer 150", plate: "KN 8831 MC", type: "moto", driver: "Patrick Ilunga", status: "En service", zone: "Kasa-Vubu", revenue: "145,000 FC", trips: 61 },
  { id: "veh-003", name: "Taxi Hiace", plate: "KN 1902 TX", type: "taxi", driver: "Cedric Kabongo", status: "Alerte", zone: "Limete", revenue: "275,000 FC", trips: 35 },
  { id: "veh-004", name: "Moto TVS", plate: "KN 5520 MT", type: "moto", driver: "Grace Makiese", status: "Maintenance", zone: "Bandal", revenue: "98,000 FC", trips: 18 }
];

const statusVariant = {
  "En service": "success",
  Maintenance: "warning",
  Alerte: "danger"
} as const;

type FleetPageProps = {
  searchParams?: { status?: string };
};

export default function InvestorFleetPage({ searchParams }: FleetPageProps) {
  const selectedStatus = searchParams?.status ?? "all";
  const data = vehicles as any;
  const filteredVehicles = selectedStatus === "all" ? data : data.filter((vehicle: any) => vehicle.status === selectedStatus);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-palm dark:text-emerald-300">Actifs suivis</p>
          <h1 className="mt-1 text-3xl font-semibold">Gestion de la Flotte</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "En service", "Maintenance", "Alerte"].map((status) => (
            <Link
              key={status}
              href={status === "all" ? "/investor/fleet" : `/investor/fleet?status=${encodeURIComponent(status)}`}
              className={`btn-secondary min-h-10 px-3 ${selectedStatus === status ? "border-palm text-palm dark:text-emerald-300" : ""}`}
            >
              <Filter size={16} aria-hidden />
              {status === "all" ? "Tous" : status}
            </Link>
          ))}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <CarTaxiFront className="text-palm dark:text-emerald-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Vehicules investis</p>
            <p className="mt-1 text-2xl font-semibold">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <MapPin className="text-river dark:text-cyan-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Zones couvertes</p>
            <p className="mt-1 text-2xl font-semibold">4</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Wrench className="text-copper dark:text-amber-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Alertes ouvertes</p>
            <p className="mt-1 text-2xl font-semibold">2</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Liste des vehicules</h2>
        </CardHeader>
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicule</TableHead>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Revenu mois</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle: any) => {
                const Icon = vehicle.type === "moto" ? Bike : CarTaxiFront;

                return (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-palm/10 p-2 text-palm dark:text-emerald-300">
                          <Icon size={18} aria-hidden />
                        </span>
                        <div>
                          <p className="font-semibold">{vehicle.name}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{vehicle.plate}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.driver}</TableCell>
                    <TableCell>{vehicle.zone}</TableCell>
                    <TableCell>
                      <Badge variant={(statusVariant as any)[vehicle.status] ?? "neutral"}>{vehicle.status}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{vehicle.revenue}</TableCell>
                    <TableCell>
                      <Link className="btn-secondary min-h-9 px-3" href={`/investor/fleet?vehicle=${vehicle.id}`}>
                        <Eye size={16} aria-hidden />
                        Voir details
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800 md:hidden">
          {filteredVehicles.map((vehicle: any) => (
            <article className="p-4" key={vehicle.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{vehicle.name}</h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{vehicle.plate} · {vehicle.zone}</p>
                </div>
                <Badge variant={(statusVariant as any)[vehicle.status] ?? "neutral"}>{vehicle.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <span className="rounded-md bg-stone-50 p-3 dark:bg-stone-900">{vehicle.driver}</span>
                <span className="rounded-md bg-stone-50 p-3 font-semibold dark:bg-stone-900">{vehicle.revenue}</span>
              </div>
              <Link className="btn-secondary mt-4 w-full" href={`/investor/fleet?vehicle=${vehicle.id}`}>
                <Eye size={16} aria-hidden />
                Voir details
              </Link>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
