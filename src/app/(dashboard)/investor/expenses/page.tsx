import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { deleteExpense } from "@/actions/expenses";
import { ExpenseForm } from "@/components/investor/ExpenseForm";
import { getCurrentUserId } from "@/lib/dashboard/data";
import { computeVehicleProfit, expenseCategoryLabels, monthRange } from "@/lib/finance/profit";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { todayInAppTimezone } from "@/lib/time/kinshasa";
import { formatCDF } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ month?: string }> };

function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

function monthTitle(month: string): string {
  return new Intl.DateTimeFormat("fr-CD", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-15T12:00:00Z`)
  );
}

export default async function InvestorExpensesPage({ searchParams }: Props) {
  const ownerId = await getCurrentUserId();
  if (!ownerId) redirect(loginWithNext(ROUTES.INVESTOR_EXPENSES));

  const params = await searchParams;
  const currentMonth = todayInAppTimezone().slice(0, 7);
  const month = params?.month && monthRange(params.month) ? params.month : currentMonth;
  const range = monthRange(month)!;

  const supabase = await createClient();
  const [{ data: vehicles }, { data: entries }, { data: expenses }] = await Promise.all([
    supabase.from("vehicles").select("id,label,plate_number").eq("owner_id", ownerId).order("label"),
    supabase
      .from("daily_entries")
      .select("vehicle_id,revenue_cdf")
      .eq("owner_id", ownerId)
      .gte("entry_date", range.start)
      .lte("entry_date", range.end),
    supabase
      .from("vehicle_expenses")
      .select("id,vehicle_id,expense_date,category,amount_cdf,note")
      .eq("owner_id", ownerId)
      .gte("expense_date", range.start)
      .lte("expense_date", range.end)
      .order("expense_date", { ascending: false })
  ]);

  const vehicleList = vehicles ?? [];
  const expenseList = (expenses ?? []).map((expense) => ({ ...expense, amount_cdf: Number(expense.amount_cdf) }));
  const { rows, totals } = computeVehicleProfit(
    vehicleList,
    (entries ?? []).map((entry) => ({ vehicle_id: entry.vehicle_id, revenue_cdf: Number(entry.revenue_cdf ?? 0) })),
    expenseList
  );
  const vehicleLabel = new Map(vehicleList.map((vehicle) => [vehicle.id, vehicle.label]));

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-300">Espace investisseur</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Dépenses & bénéfice</h1>
          <p className="mt-1 text-sm text-neutral-400">Recettes déclarées moins dépenses, véhicule par véhicule.</p>
        </div>
        <nav className="flex items-center gap-2" aria-label="Choix du mois">
          <Link className="btn-secondary min-h-10 px-3" href={`?month=${shiftMonth(month, -1)}`} aria-label="Mois précédent">
            <ChevronLeft size={16} aria-hidden />
          </Link>
          <span className="min-w-36 text-center font-semibold capitalize text-white">{monthTitle(month)}</span>
          <Link
            className={`btn-secondary min-h-10 px-3 ${month >= currentMonth ? "pointer-events-none opacity-40" : ""}`}
            href={`?month=${shiftMonth(month, 1)}`}
            aria-label="Mois suivant"
          >
            <ChevronRight size={16} aria-hidden />
          </Link>
        </nav>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Recettes", value: totals.revenue, icon: TrendingUp, tone: "text-emerald-300" },
          { label: "Dépenses", value: totals.expenses, icon: TrendingDown, tone: "text-amber-300" },
          { label: "Bénéfice net", value: totals.net, icon: Wallet, tone: totals.net >= 0 ? "text-emerald-300" : "text-red-300" }
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <Icon size={20} className={tone} aria-hidden />
            <p className="mt-3 text-sm text-neutral-400">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${label === "Bénéfice net" ? tone : "text-white"}`}>{formatCDF(value)}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50">
        <h2 className="border-b border-neutral-800 px-5 py-4 text-base font-semibold text-white">Par véhicule</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-neutral-400">
              <tr>
                <th className="px-5 py-3 font-medium">Véhicule</th>
                <th className="px-5 py-3 text-right font-medium">Recettes</th>
                <th className="px-5 py-3 text-right font-medium">Dépenses</th>
                <th className="px-5 py-3 text-right font-medium">Bénéfice net</th>
                <th className="px-5 py-3 text-right font-medium">Marge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((row) => (
                <tr key={row.vehicle_id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{row.label}</p>
                    <p className="text-xs text-neutral-500">
                      {row.plate_number}
                      {Object.entries(row.byCategory).length
                        ? ` · ${Object.entries(row.byCategory)
                            .map(([category, amount]) => `${expenseCategoryLabels[category as keyof typeof expenseCategoryLabels]} ${formatCDF(amount ?? 0)}`)
                            .join(", ")}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-right text-neutral-200">{formatCDF(row.revenue)}</td>
                  <td className="px-5 py-3 text-right text-amber-200">{formatCDF(row.expenses)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${row.net >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {formatCDF(row.net)}
                  </td>
                  <td className="px-5 py-3 text-right text-neutral-300">{row.margin === null ? "—" : `${row.margin} %`}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-neutral-500">
                    Ajoutez un véhicule pour suivre son bénéfice.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Nouvelle dépense</h2>
        <ExpenseForm vehicles={vehicleList} />
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50">
        <h2 className="border-b border-neutral-800 px-5 py-4 text-base font-semibold text-white">Dépenses du mois</h2>
        <div className="divide-y divide-neutral-800">
          {expenseList.map((expense) => (
            <article key={expense.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="font-medium text-white">
                  {expenseCategoryLabels[expense.category]} · {vehicleLabel.get(expense.vehicle_id) ?? "Véhicule"}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {expense.expense_date}
                  {expense.note ? ` · ${expense.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-amber-200">{formatCDF(expense.amount_cdf)}</span>
                <form action={deleteExpense}>
                  <input type="hidden" name="expense_id" value={expense.id} />
                  <button type="submit" className="rounded-md p-2 text-neutral-500 hover:text-red-300" aria-label="Supprimer la dépense">
                    <Trash2 size={15} aria-hidden />
                  </button>
                </form>
              </div>
            </article>
          ))}
          {expenseList.length === 0 ? <p className="px-5 py-6 text-sm text-neutral-500">Aucune dépense ce mois-ci.</p> : null}
        </div>
      </section>
    </div>
  );
}
