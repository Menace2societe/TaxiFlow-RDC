import Link from "next/link";
import { CalendarDays, Download, Filter, TrendingUp, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROUTES } from "@/lib/routes";

const monthlyRevenue = [
  { month: "Jan", value: "880,000 FC", progress: 58 },
  { month: "Fev", value: "1,020,000 FC", progress: 68 },
  { month: "Mar", value: "1,180,000 FC", progress: 78 },
  { month: "Avr", value: "1,250,000 FC", progress: 83 },
  { month: "Mai", value: "1,410,000 FC", progress: 94 }
] as const;

const payouts = [
  { week: "Semaine 18", date: "05 Mai 2026", label: "Distribution investisseur", amount: "420,000 FC", status: "Verse" },
  { week: "Semaine 17", date: "28 Avr 2026", label: "Reserve maintenance", amount: "85,000 FC", status: "Reserve" },
  { week: "Semaine 16", date: "20 Avr 2026", label: "Bonus performance flotte", amount: "60,000 FC", status: "Verse" },
  { week: "Semaine 15", date: "13 Avr 2026", label: "Distribution investisseur", amount: "390,000 FC", status: "Verse" }
] as const;

export default function InvestorRevenuePage() {
  const revenueData = monthlyRevenue;
  const payoutData = payouts;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-palm dark:text-emerald-300">Rendements</p>
          <h1 className="mt-1 text-3xl font-semibold">Details financiers</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-secondary min-h-10 px-3" href={`${ROUTES.INVESTOR_REVENUE}?period=month`}>
            <Filter size={16} aria-hidden />
            Filtrer
          </Link>
          <Link className="btn-primary min-h-10 px-3" href={`${ROUTES.INVESTOR_DOCUMENTS}?report=revenue`}>
            <Download size={16} aria-hidden />
            Telecharger rapport
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <WalletCards className="text-palm dark:text-emerald-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Revenus bruts</p>
            <p className="mt-1 text-2xl font-semibold">1,410,000 FC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <TrendingUp className="text-river dark:text-cyan-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Rendement net</p>
            <p className="mt-1 text-2xl font-semibold">465,000 FC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CalendarDays className="text-copper dark:text-amber-300" size={24} aria-hidden />
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Croissance</p>
            <p className="mt-1 text-2xl font-semibold">+18%</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Graphique mensuel</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueData.map((item) => (
                <div key={item.month}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">{item.month}</span>
                    <span className="text-stone-500 dark:text-stone-400">{item.value}</span>
                  </div>
                  <div className="h-4 rounded-full bg-stone-100 dark:bg-stone-800">
                    <div className="h-4 rounded-full bg-river" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Synthese</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-stone-50 p-3 dark:bg-stone-900">
              <p className="text-sm text-stone-500 dark:text-stone-400">Marge operationnelle</p>
              <p className="mt-1 text-xl font-semibold">33%</p>
            </div>
            <div className="rounded-md bg-stone-50 p-3 dark:bg-stone-900">
              <p className="text-sm text-stone-500 dark:text-stone-400">Reserve maintenance</p>
              <p className="mt-1 text-xl font-semibold">185,000 FC</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Historique des versements hebdomadaires</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Semaine</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutData.map((payout) => (
                <TableRow key={`${payout.week}-${payout.label}`}>
                  <TableCell>{payout.week}</TableCell>
                  <TableCell>{payout.date}</TableCell>
                  <TableCell>{payout.label}</TableCell>
                  <TableCell className="font-semibold">{payout.amount}</TableCell>
                  <TableCell>
                    <Badge variant={payout.status === "Verse" ? "success" : "warning"}>{payout.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link className="btn-secondary min-h-9 px-3" href={`/investor/documents?statement=${encodeURIComponent(payout.week)}`}>
                      <Download size={16} aria-hidden />
                      Recu
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
