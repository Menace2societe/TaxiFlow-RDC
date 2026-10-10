import "server-only";

import { toCsv, type CsvColumn } from "@/lib/csv";
import { getInvestorPayments, type InvestorPayment } from "@/lib/dashboard/data";
import { createClient } from "@/lib/supabase/server";

const MAX_EXPORT_ROWS = 5000;

const paymentStatusLabels: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  validated: "Validé",
  rejected: "Rejeté"
};

export type DateRange = { from?: string; to?: string };

/** Garde uniquement des dates YYYY-MM-DD valides venant de l'URL. */
export function parseDateRange(searchParams: URLSearchParams): DateRange {
  const valid = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);
  return { from: valid(searchParams.get("from")), to: valid(searchParams.get("to")) };
}

type EntryExportRow = {
  entry_date: string;
  vehicle: string;
  plate: string;
  driver: string;
  amount: number;
  currency: string;
  revenue_cdf: number;
  start_km: number;
  end_km: number;
  distance_covered: number;
  is_suspicious: boolean;
  fuel_cdf: number;
  maintenance_cdf: number;
  notes: string | null;
};

const entryColumns: CsvColumn<EntryExportRow>[] = [
  { header: "Date", value: (row) => row.entry_date },
  { header: "Véhicule", value: (row) => row.vehicle },
  { header: "Plaque", value: (row) => row.plate },
  { header: "Chauffeur", value: (row) => row.driver },
  { header: "Montant", value: (row) => row.amount },
  { header: "Devise", value: (row) => row.currency },
  { header: "Montant CDF", value: (row) => row.revenue_cdf },
  { header: "Km départ", value: (row) => row.start_km },
  { header: "Km arrivée", value: (row) => row.end_km },
  { header: "Distance (km)", value: (row) => row.distance_covered },
  { header: "Alerte km", value: (row) => row.is_suspicious },
  { header: "Carburant CDF", value: (row) => row.fuel_cdf },
  { header: "Entretien CDF", value: (row) => row.maintenance_cdf },
  { header: "Note", value: (row) => row.notes }
];

/** Recettes journalières du propriétaire (RLS : uniquement les siennes). */
export async function buildEntriesCsv(ownerId: string, range: DateRange): Promise<string> {
  const supabase = await createClient();
  let query = supabase
    .from("daily_entries")
    .select(
      "entry_date,vehicle_id,driver_id,amount,currency,revenue_cdf,start_km,end_km,distance_covered,is_suspicious,fuel_cdf,maintenance_cdf,notes"
    )
    .eq("owner_id", ownerId)
    .order("entry_date", { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  if (range.from) query = query.gte("entry_date", range.from);
  if (range.to) query = query.lte("entry_date", range.to);

  const { data: entries, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = entries ?? [];
  const vehicleIds = Array.from(new Set(rows.map((row) => row.vehicle_id)));
  const driverIds = Array.from(new Set(rows.map((row) => row.driver_id).filter(Boolean))) as string[];

  const [{ data: vehicles }, { data: drivers }] = await Promise.all([
    vehicleIds.length
      ? supabase.from("vehicles").select("id,label,plate_number").in("id", vehicleIds)
      : Promise.resolve({ data: [] as { id: string; label: string; plate_number: string }[] }),
    driverIds.length
      ? supabase.from("profiles").select("id,full_name").in("id", driverIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] })
  ]);

  const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));
  const driverById = new Map((drivers ?? []).map((driver) => [driver.id, driver.full_name]));

  return toCsv(
    rows.map((row) => ({
      entry_date: row.entry_date,
      vehicle: vehicleById.get(row.vehicle_id)?.label ?? "",
      plate: vehicleById.get(row.vehicle_id)?.plate_number ?? "",
      driver: (row.driver_id && driverById.get(row.driver_id)) || "",
      amount: Number(row.amount ?? 0),
      currency: row.currency,
      revenue_cdf: Number(row.revenue_cdf ?? 0),
      start_km: Number(row.start_km ?? 0),
      end_km: Number(row.end_km ?? 0),
      distance_covered: Number(row.distance_covered ?? 0),
      is_suspicious: Boolean(row.is_suspicious),
      fuel_cdf: Number(row.fuel_cdf ?? 0),
      maintenance_cdf: Number(row.maintenance_cdf ?? 0),
      notes: row.notes
    })),
    entryColumns
  );
}

const paymentColumns: CsvColumn<InvestorPayment>[] = [
  { header: "Date", value: (row) => row.payment_date },
  { header: "Chauffeur", value: (row) => row.driver_name },
  { header: "Véhicule", value: (row) => row.vehicle_label },
  { header: "Montant CDF", value: (row) => row.amount },
  { header: "Statut", value: (row) => paymentStatusLabels[row.status] ?? row.status },
  { header: "Source", value: (row) => (row.source === "manual_backup" ? "Saisie manuelle" : "Chauffeur") },
  { header: "Commentaire", value: (row) => row.comment },
  { header: "Enregistré le", value: (row) => row.created_at }
];

/** Versements reçus par l'investisseur. */
export async function buildPaymentsCsv(investorId: string, range: DateRange): Promise<string> {
  const payments = await getInvestorPayments(investorId, MAX_EXPORT_ROWS);
  const filtered = payments.filter(
    (payment) => (!range.from || payment.payment_date >= range.from) && (!range.to || payment.payment_date <= range.to)
  );
  return toCsv(filtered, paymentColumns);
}
