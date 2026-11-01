import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { deleteExpense } from "@/actions/expenses";
import { PlateChip, StateMark } from "@/components/driver/plate";
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

/** « 2026-10-12 » → « 12 oct. », sans décalage de fuseau. */
function shortDay(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-CD", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${isoDate.slice(0, 10)}T12:00:00Z`)
  );
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
  const vehicleById = new Map(vehicleList.map((vehicle) => [vehicle.id, vehicle]));
  const isCurrentMonth = month >= currentMonth;

  return (
    <div className="pb-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-plate text-[30px] font-bold leading-tight">Dépenses et bénéfice</h1>
          <p className="mt-1 text-[16px]">Recettes déclarées moins dépenses, véhicule par véhicule.</p>
        </div>
        <nav className="flex items-center gap-2" aria-label="Choix du mois">
          <Link className="btn-secondary h-[52px] w-[52px] px-0" href={`?month=${shiftMonth(month, -1)}`} aria-label="Mois précédent">
            <ChevronLeft size={20} aria-hidden />
          </Link>
          <span className="min-w-40 text-center font-plate text-[22px] font-bold capitalize">{monthTitle(month)}</span>
          {isCurrentMonth ? (
            <span
              className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-xl border-2 border-plate-rule text-plate-soft"
              aria-disabled="true"
              aria-label="Mois suivant (pas encore commencé)"
            >
              <ChevronRight size={20} aria-hidden />
            </span>
          ) : (
            <Link className="btn-secondary h-[52px] w-[52px] px-0" href={`?month=${shiftMonth(month, 1)}`} aria-label="Mois suivant">
              <ChevronRight size={20} aria-hidden />
            </Link>
          )}
        </nav>
      </header>

      {/* ─── Les trois chiffres du mois ─── */}
      <dl className="mt-6 grid grid-cols-1 border-y-2 border-plate-rule sm:grid-cols-3">
        <div className="flex items-baseline justify-between gap-3 py-3 sm:block sm:pr-4">
          <dt className="text-[15px] font-semibold">Recettes</dt>
          <dd className="font-plate text-[26px] font-bold leading-tight">{formatCDF(totals.revenue)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t-2 border-plate-rule py-3 sm:block sm:border-l-2 sm:border-t-0 sm:px-4">
          <dt className="text-[15px] font-semibold">Dépenses</dt>
          <dd className="font-plate text-[26px] font-bold leading-tight">{formatCDF(totals.expenses)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t-2 border-plate-rule py-3 sm:block sm:border-l-2 sm:border-t-0 sm:px-4">
          <dt className="flex items-center gap-2 text-[15px] font-semibold">
            {totals.net < 0 ? <StateMark state="bad" /> : null}
            {totals.net < 0 ? "Perte nette" : "Bénéfice net"}
          </dt>
          <dd className={`font-plate text-[26px] font-bold leading-tight ${totals.net < 0 ? "text-plate-bad" : ""}`}>
            {formatCDF(totals.net)}
          </dd>
        </div>
      </dl>

      {/* ─── Par véhicule ─── */}
      <section aria-labelledby="by-vehicle-title" className="mt-10">
        <h2 id="by-vehicle-title" className="font-plate text-[24px] font-bold">
          Par véhicule
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[680px] border-b-2 border-plate-rule text-left text-[16px]">
            <thead>
              <tr className="text-[15px]">
                <th scope="col" className="py-2 pr-4 font-semibold">Véhicule</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Recettes</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Dépenses</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Bénéfice net</th>
                <th scope="col" className="py-2 pl-4 text-right font-semibold">Marge</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.vehicle_id} className="border-t-2 border-plate-rule align-top">
                  <td className="py-3 pr-4">
                    <span className="flex flex-wrap items-center gap-2">
                      <PlateChip plateNumber={row.plate_number} />
                      <span className="font-semibold">{row.label}</span>
                    </span>
                    {Object.entries(row.byCategory).length ? (
                      <span className="mt-1 block text-[15px] text-plate-soft">
                        {Object.entries(row.byCategory)
                          .map(
                            ([category, amount]) =>
                              `${expenseCategoryLabels[category as keyof typeof expenseCategoryLabels]} ${formatCDF(amount ?? 0)}`
                          )
                          .join(", ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-plate text-[17px] font-bold">{formatCDF(row.revenue)}</td>
                  <td className="px-4 py-3 text-right font-plate text-[17px] font-bold">{formatCDF(row.expenses)}</td>
                  <td className="px-4 py-3 text-right font-plate text-[17px] font-bold">
                    <span className={`inline-flex items-center gap-2 ${row.net < 0 ? "text-plate-bad" : ""}`}>
                      {row.net < 0 ? (
                        <>
                          <StateMark state="bad" />
                          <span className="sr-only">Perte : </span>
                        </>
                      ) : null}
                      {formatCDF(row.net)}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right font-plate text-[17px] font-bold">
                    {row.margin === null ? "—" : `${row.margin} %`}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr className="border-t-2 border-plate-rule">
                  <td colSpan={5} className="py-6 text-[16px]">
                    Ajoutez un véhicule pour suivre son bénéfice.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Nouvelle dépense ─── */}
      <section aria-labelledby="new-expense-title" className="mt-10">
        <h2 id="new-expense-title" className="font-plate text-[24px] font-bold">
          Nouvelle dépense
        </h2>
        <div className="mt-3 rounded-xl border-2 border-plate-rule bg-plate-white p-4 md:p-5">
          <ExpenseForm vehicles={vehicleList} />
        </div>
      </section>

      {/* ─── Dépenses du mois ─── */}
      <section aria-labelledby="month-expenses-title" className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="month-expenses-title" className="font-plate text-[24px] font-bold">
            Dépenses du mois
          </h2>
          <p className="text-[14px] font-medium">
            {expenseList.length} dépense{expenseList.length > 1 ? "s" : ""}
          </p>
        </div>
        {expenseList.length > 0 ? (
          <ul className="mt-2 border-b-2 border-plate-rule">
            {expenseList.map((expense) => {
              const vehicle = vehicleById.get(expense.vehicle_id);
              return (
                <li key={expense.id} className="flex items-center gap-3 border-t-2 border-plate-rule py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {vehicle ? <PlateChip plateNumber={vehicle.plate_number} /> : null}
                      <span className="font-semibold">{expenseCategoryLabels[expense.category]}</span>
                      <span className="text-[15px]">· {vehicle?.label ?? "Véhicule"}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[15px] text-plate-soft">
                      {shortDay(expense.expense_date)}
                      {expense.note ? ` · ${expense.note}` : ""}
                    </p>
                  </div>
                  <span className="text-right font-plate text-[21px] font-bold">{formatCDF(expense.amount_cdf)}</span>
                  <form action={deleteExpense}>
                    <input type="hidden" name="expense_id" value={expense.id} />
                    <button type="submit" className="btn-danger h-12 w-12 px-0" aria-label="Supprimer la dépense">
                      <Trash2 size={18} aria-hidden />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border-2 border-dashed border-plate-ink px-5 py-5 text-[16px]">Aucune dépense ce mois-ci.</p>
        )}
      </section>
    </div>
  );
}
