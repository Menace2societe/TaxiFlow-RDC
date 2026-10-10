import type { ExpenseCategory } from "@/lib/supabase/types";

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  carburant: "Carburant",
  entretien: "Entretien",
  reparation: "Réparation",
  assurance: "Assurance",
  taxe: "Taxes & vignette",
  autre: "Autre"
};

export type ProfitVehicle = { id: string; label: string; plate_number: string };
export type ProfitEntry = { vehicle_id: string; revenue_cdf: number };
export type ProfitExpense = { vehicle_id: string; category: ExpenseCategory; amount_cdf: number };

export type VehicleProfit = {
  vehicle_id: string;
  label: string;
  plate_number: string;
  revenue: number;
  expenses: number;
  byCategory: Partial<Record<ExpenseCategory, number>>;
  net: number;
  /** Bénéfice / recettes, en %, ou null sans recette. */
  margin: number | null;
};

/** Bénéfice net par véhicule = recettes déclarées − dépenses, sur la même période. */
export function computeVehicleProfit(
  vehicles: ProfitVehicle[],
  entries: ProfitEntry[],
  expenses: ProfitExpense[]
): { rows: VehicleProfit[]; totals: { revenue: number; expenses: number; net: number } } {
  const rows = vehicles.map((vehicle) => {
    const revenue = entries
      .filter((entry) => entry.vehicle_id === vehicle.id)
      .reduce((sum, entry) => sum + Number(entry.revenue_cdf || 0), 0);
    const byCategory: Partial<Record<ExpenseCategory, number>> = {};
    let total = 0;
    for (const expense of expenses) {
      if (expense.vehicle_id !== vehicle.id) continue;
      const amount = Number(expense.amount_cdf || 0);
      byCategory[expense.category] = (byCategory[expense.category] ?? 0) + amount;
      total += amount;
    }
    const net = revenue - total;
    return {
      vehicle_id: vehicle.id,
      label: vehicle.label,
      plate_number: vehicle.plate_number,
      revenue,
      expenses: total,
      byCategory,
      net,
      margin: revenue > 0 ? Math.round((net / revenue) * 1000) / 10 : null
    };
  });

  const totals = rows.reduce(
    (sum, row) => ({ revenue: sum.revenue + row.revenue, expenses: sum.expenses + row.expenses, net: sum.net + row.net }),
    { revenue: 0, expenses: 0, net: 0 }
  );

  return { rows: rows.sort((a, b) => b.net - a.net), totals };
}

/** "2026-10" → bornes inclusives du mois. Retourne null si le format est invalide. */
export function monthRange(month: string): { start: string; end: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  if (monthIndex < 1 || monthIndex > 12) return null;
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}
