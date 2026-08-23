import { createClient } from "@/lib/supabase/server";
import type { BreakdownStatus, EntryCurrency, PaymentStatus, VehicleStatus } from "@/lib/supabase/types";

export type DashboardVehicle = {
  id: string;
  label: string;
  plate_number: string;
  type: "taxi" | "moto";
  status: VehicleStatus;
  driver_id: string | null;
  driver_name: string | null;
  /** Numéro de téléphone du chauffeur. Vaut 'Non renseigné' si absent. */
  driver_phone: string | null;
  target_daily_revenue: number;
};

export type DashboardEntry = {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  entry_date: string;
  amount: number;
  declared_amount: number;
  currency: EntryCurrency;
  mileage_km: number;
  start_km: number;
  end_km: number;
  distance_covered: number;
  is_suspicious: boolean;
  revenue_cdf: number;
  fuel_cdf: number;
  maintenance_cdf: number;
  notes: string | null;
};

export type DashboardPayment = {
  id: string;
  amount: number;
  driver_id: string;
  vehicle_id: string;
  investor_id: string;
  status: PaymentStatus;
  created_at: string;
};

export type DashboardBreakdown = {
  id: string;
  vehicle_id: string;
  reported_by: string;
  type: string;
  description: string | null;
  estimated_cost: number;
  status: BreakdownStatus;
  created_at: string;
};

export async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

/**
 * Récupère tous les véhicules d'un propriétaire avec les informations du chauffeur
 * assigné (nom, téléphone). Tolérante aux pannes : si la requête sur `profiles`
 * échoue (ex. colonne manquante temporairement), les véhicules sont quand même
 * retournés avec des valeurs de secours pour les champs chauffeur.
 */
export async function getOwnerVehicles(ownerId: string): Promise<DashboardVehicle[]> {
  const supabase = await createClient();

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id,label,plate_number,type,status,driver_id,target_daily_revenue")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (vehiclesError) {
    console.error("[getOwnerVehicles] Erreur récupération véhicules :", vehiclesError.message);
    return [];
  }

  const rows = vehicles ?? [];
  const driverIds = Array.from(
    new Set(rows.map((v) => (v as { driver_id: string | null }).driver_id).filter(Boolean))
  ) as string[];

  // Récupération des profils chauffeurs avec fallback défensif
  let driverById = new Map<string, { id: string; full_name: string | null; phone: string | null }>();

  if (driverIds.length > 0) {
    try {
      const { data: drivers, error: driversError } = await supabase
        .from("profiles")
        .select("id,full_name,phone")
        .in("id", driverIds);

      if (driversError) {
        // La colonne phone peut manquer sur une base non migrée : on log et on continue.
        console.warn(
          "[getOwnerVehicles] Impossible de charger les profils chauffeurs :",
          driversError.message
        );
      } else {
        driverById = new Map(
          (drivers ?? []).map((d) => [
            d.id,
            {
              id: d.id,
              full_name: (d as { full_name?: string | null }).full_name ?? null,
              // Fallback si phone est absent ou null
              phone: (d as { phone?: string | null }).phone ?? null
            }
          ])
        );
      }
    } catch (err) {
      // Erreur réseau ou schéma : on continue avec des données partielles.
      console.warn("[getOwnerVehicles] Exception lors du chargement des profils :", err);
    }
  }

  return rows.map((vehicle) => {
    const v = vehicle as {
      id: string;
      label: string;
      plate_number: string;
      type: "taxi" | "moto";
      status: VehicleStatus;
      driver_id: string | null;
      target_daily_revenue: number;
    };
    const driver = v.driver_id ? driverById.get(v.driver_id) : null;

    return {
      id: v.id,
      label: v.label,
      plate_number: v.plate_number,
      type: v.type,
      status: v.status,
      driver_id: v.driver_id,
      target_daily_revenue: Number(v.target_daily_revenue ?? 0),
      driver_name: driver?.full_name ?? null,
      driver_phone: driver?.phone ?? null
    };
  });
}

export async function getOwnerEntries(ownerId: string): Promise<DashboardEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_entries")
    .select(
      "id,vehicle_id,driver_id,entry_date,amount,declared_amount,currency,mileage_km,start_km,end_km,distance_covered,is_suspicious,revenue_cdf,fuel_cdf,maintenance_cdf,notes"
    )
    .eq("owner_id", ownerId)
    .order("entry_date", { ascending: false })
    .limit(60);

  if (error) {
    console.error("[getOwnerEntries] Erreur :", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    vehicle_id: row.vehicle_id,
    driver_id: (row as { driver_id?: string | null }).driver_id ?? null,
    entry_date: row.entry_date,
    amount: Number(row.amount ?? 0),
    declared_amount: Number((row as { declared_amount?: number }).declared_amount ?? row.amount ?? 0),
    currency: row.currency as EntryCurrency,
    mileage_km: Number(row.mileage_km ?? 0),
    start_km: Number((row as { start_km?: number }).start_km ?? 0),
    end_km: Number((row as { end_km?: number }).end_km ?? row.mileage_km ?? 0),
    distance_covered: Number((row as { distance_covered?: number }).distance_covered ?? 0),
    is_suspicious: Boolean((row as { is_suspicious?: boolean }).is_suspicious ?? false),
    revenue_cdf: Number(row.revenue_cdf ?? 0),
    fuel_cdf: Number((row as { fuel_cdf?: number }).fuel_cdf ?? 0),
    maintenance_cdf: Number((row as { maintenance_cdf?: number }).maintenance_cdf ?? 0),
    notes: (row as { notes?: string | null }).notes ?? null
  }));
}

export async function getOwnerEntriesForDateRange(
  ownerId: string,
  startDate: string,
  endDate: string
): Promise<DashboardEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_entries")
    .select(
      "id,vehicle_id,driver_id,entry_date,amount,declared_amount,currency,mileage_km,start_km,end_km,distance_covered,is_suspicious,revenue_cdf,fuel_cdf,maintenance_cdf,notes"
    )
    .eq("owner_id", ownerId)
    .gte("entry_date", startDate)
    .lte("entry_date", endDate);

  if (error) {
    console.error("[getOwnerEntriesForDateRange] Erreur :", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    vehicle_id: row.vehicle_id,
    driver_id: (row as { driver_id?: string | null }).driver_id ?? null,
    entry_date: row.entry_date,
    amount: Number(row.amount ?? 0),
    declared_amount: Number((row as { declared_amount?: number }).declared_amount ?? row.amount ?? 0),
    currency: row.currency as EntryCurrency,
    mileage_km: Number(row.mileage_km ?? 0),
    start_km: Number((row as { start_km?: number }).start_km ?? 0),
    end_km: Number((row as { end_km?: number }).end_km ?? row.mileage_km ?? 0),
    distance_covered: Number((row as { distance_covered?: number }).distance_covered ?? 0),
    is_suspicious: Boolean((row as { is_suspicious?: boolean }).is_suspicious ?? false),
    revenue_cdf: Number(row.revenue_cdf ?? 0),
    fuel_cdf: Number((row as { fuel_cdf?: number }).fuel_cdf ?? 0),
    maintenance_cdf: Number((row as { maintenance_cdf?: number }).maintenance_cdf ?? 0),
    notes: (row as { notes?: string | null }).notes ?? null
  }));
}

export function revenueCdfByVehicle(entries: DashboardEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(entry.vehicle_id, (map.get(entry.vehicle_id) ?? 0) + entry.revenue_cdf);
  }
  return map;
}

export type DriverProfileRow = {
  id: string;
  full_name: string | null;
  /** Vaut null si la colonne n'est pas encore migrée sur la base cible. */
  phone: string | null;
};

/**
 * Récupère tous les profils chauffeurs. Tolérante aux pannes sur `phone` :
 * si la colonne est absente, retourne quand même les profils avec `phone: null`.
 */
export async function getDriverProfiles(): Promise<DriverProfileRow[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,phone")
      .eq("role", "driver")
      .order("full_name");

    if (error) {
      console.warn("[getDriverProfiles] Erreur :", error.message);
      // Tentative de repli sans la colonne phone si le schéma est en retard
      const { data: fallback } = await supabase
        .from("profiles")
        .select("id,full_name")
        .eq("role", "driver")
        .order("full_name");

      return (fallback ?? []).map((row) => ({
        id: row.id,
        full_name: row.full_name ?? null,
        phone: null
      }));
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      full_name: (row as { full_name?: string | null }).full_name ?? null,
      phone: (row as { phone?: string | null }).phone ?? null
    }));
  } catch (err) {
    console.error("[getDriverProfiles] Exception :", err);
    return [];
  }
}

export async function getOwnerNonResolvedBreakdownsCount(ownerId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { data: vehicleRows, error: vehErr } = await supabase
      .from("vehicles")
      .select("id")
      .eq("owner_id", ownerId);

    if (vehErr) {
      console.warn("[getOwnerNonResolvedBreakdownsCount] Erreur véhicules :", vehErr.message);
      return 0;
    }

    const ids = (vehicleRows ?? []).map((row: { id: string }) => row.id);
    if (ids.length === 0) {
      return 0;
    }

    const { count, error: countErr } = await supabase
      .from("breakdowns")
      .select("id", { head: true, count: "exact" })
      .in("vehicle_id", ids)
      .neq("status", "resolved");

    if (countErr) {
      console.warn(
        "[getOwnerNonResolvedBreakdownsCount] Erreur comptage pannes :",
        countErr.message
      );
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error("[getOwnerNonResolvedBreakdownsCount] Exception :", err);
    return 0;
  }
}

export type DriverVehicleRow = {
  id: string;
  label: string;
  plate_number: string;
  owner_id: string;
  driver_id: string | null;
  target_daily_revenue: number;
  type: "taxi" | "moto";
  status: VehicleStatus;
};

export async function getDriverAssignedVehicle(driverId: string): Promise<DriverVehicleRow | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select("id,label,plate_number,owner_id,driver_id,target_daily_revenue,type,status")
      .eq("driver_id", driverId)
      .maybeSingle();

    if (error) {
      console.warn("[getDriverAssignedVehicle] Erreur :", error.message);
      return null;
    }

    if (!data) return null;

    const row = data as {
      id: string;
      label: string;
      plate_number: string;
      owner_id: string;
      driver_id: string | null;
      target_daily_revenue: number;
      type: "taxi" | "moto";
      status: VehicleStatus;
    };

    return {
      id: row.id,
      label: row.label,
      plate_number: row.plate_number,
      owner_id: row.owner_id,
      driver_id: row.driver_id,
      target_daily_revenue: Number(row.target_daily_revenue ?? 0),
      type: row.type,
      status: row.status
    };
  } catch (err) {
    console.error("[getDriverAssignedVehicle] Exception :", err);
    return null;
  }
}

export async function getDriverRecentEntries(
  driverId: string,
  limit = 5
): Promise<DashboardEntry[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("daily_entries")
      .select(
        "id,vehicle_id,driver_id,entry_date,amount,declared_amount,currency,mileage_km,start_km,end_km,distance_covered,is_suspicious,revenue_cdf,fuel_cdf,maintenance_cdf,notes"
      )
      .eq("driver_id", driverId)
      .order("entry_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[getDriverRecentEntries] Erreur :", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      vehicle_id: row.vehicle_id,
      driver_id: (row as { driver_id?: string | null }).driver_id ?? null,
      entry_date: row.entry_date,
      amount: Number(row.amount ?? 0),
      declared_amount: Number((row as { declared_amount?: number }).declared_amount ?? row.amount ?? 0),
      currency: row.currency as EntryCurrency,
      mileage_km: Number(row.mileage_km ?? 0),
      start_km: Number((row as { start_km?: number }).start_km ?? 0),
      end_km: Number((row as { end_km?: number }).end_km ?? row.mileage_km ?? 0),
      distance_covered: Number((row as { distance_covered?: number }).distance_covered ?? 0),
      is_suspicious: Boolean((row as { is_suspicious?: boolean }).is_suspicious ?? false),
      revenue_cdf: Number(row.revenue_cdf ?? 0),
      fuel_cdf: Number((row as { fuel_cdf?: number }).fuel_cdf ?? 0),
      maintenance_cdf: Number((row as { maintenance_cdf?: number }).maintenance_cdf ?? 0),
      notes: (row as { notes?: string | null }).notes ?? null
    }));
  } catch (err) {
    console.error("[getDriverRecentEntries] Exception :", err);
    return [];
  }
}

export async function getDriverRecentPayments(driverId: string, limit = 8): Promise<DashboardPayment[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("id,amount,driver_id,vehicle_id,investor_id,status,created_at")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[getDriverRecentPayments] Erreur :", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      amount: Number(row.amount ?? 0),
      driver_id: row.driver_id,
      vehicle_id: row.vehicle_id,
      investor_id: row.investor_id,
      status: row.status,
      created_at: row.created_at
    }));
  } catch (err) {
    console.error("[getDriverRecentPayments] Exception :", err);
    return [];
  }
}

export async function getDriverRecentBreakdowns(driverId: string, limit = 8): Promise<DashboardBreakdown[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("breakdowns")
      .select("id,vehicle_id,reported_by,type,description,estimated_cost,status,created_at")
      .eq("reported_by", driverId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[getDriverRecentBreakdowns] Erreur :", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      vehicle_id: row.vehicle_id,
      reported_by: row.reported_by,
      type: row.type,
      description: row.description,
      estimated_cost: Number(row.estimated_cost ?? 0),
      status: row.status,
      created_at: row.created_at
    }));
  } catch (err) {
    console.error("[getDriverRecentBreakdowns] Exception :", err);
    return [];
  }
}

/**
 * Récupère toutes les pannes du véhicule assigné au chauffeur.
 * Fonctionne pour :
 * - Les chauffeurs salariés (vehicle.driver_id = driverId)
 * - Les chauffeurs-patrons (vehicle.owner_id = driverId ET vehicle.driver_id = driverId)
 * La requête cherche le véhicule via driver_id, ce qui couvre les deux cas.
 */
export async function getDriverVehicleBreakdowns(driverId: string): Promise<DashboardBreakdown[]> {
  try {
    const supabase = await createClient();

    // Chercher le véhicule du chauffeur (driver_id = driverId)
    const { data: vehicle, error: vehicleErr } = await supabase
      .from("vehicles")
      .select("id")
      .eq("driver_id", driverId)
      .maybeSingle();

    if (vehicleErr) {
      console.warn("[getDriverVehicleBreakdowns] Erreur véhicule :", vehicleErr.message);
      return [];
    }

    if (!vehicle?.id) {
      return [];
    }

    // Récupérer toutes les pannes de ce véhicule, triées par date décroissante
    const { data, error } = await supabase
      .from("breakdowns")
      .select("id,vehicle_id,reported_by,type,description,estimated_cost,status,created_at")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[getDriverVehicleBreakdowns] Erreur pannes :", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      vehicle_id: row.vehicle_id,
      reported_by: row.reported_by,
      type: row.type,
      description: row.description,
      estimated_cost: Number(row.estimated_cost ?? 0),
      status: row.status as BreakdownStatus,
      created_at: row.created_at
    }));
  } catch (err) {
    console.error("[getDriverVehicleBreakdowns] Exception :", err);
    return [];
  }
}

export async function getOwnerRecentPayments(ownerId: string, limit = 20): Promise<DashboardPayment[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("id,amount,driver_id,vehicle_id,investor_id,status,created_at")
      .eq("investor_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[getOwnerRecentPayments] Erreur :", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      amount: Number(row.amount ?? 0),
      driver_id: row.driver_id,
      vehicle_id: row.vehicle_id,
      investor_id: row.investor_id,
      status: row.status,
      created_at: row.created_at
    }));
  } catch (err) {
    console.error("[getOwnerRecentPayments] Exception :", err);
    return [];
  }
}

export function summarize(entries: DashboardEntry[], vehicles: DashboardVehicle[]) {
  const totalRevenue = entries.reduce((sum, entry) => sum + entry.revenue_cdf, 0);
  const totalCosts = entries.reduce(
    (sum, entry) => sum + entry.fuel_cdf + entry.maintenance_cdf,
    0
  );
  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === "en service").length;
  const target = vehicles.reduce((sum, vehicle) => sum + vehicle.target_daily_revenue, 0);

  return {
    totalRevenue,
    totalCosts,
    netRevenue: totalRevenue - totalCosts,
    activeVehicles,
    totalVehicles: vehicles.length,
    target
  };
}

export function entriesByDate(entries: DashboardEntry[]) {
  const grouped = entries.reduce<Record<string, { date: string; revenue: number; costs: number }>>(
    (acc, entry) => {
      const date = new Intl.DateTimeFormat("fr-CD", { day: "2-digit", month: "short" }).format(
        new Date(entry.entry_date)
      );
      acc[date] ??= { date, revenue: 0, costs: 0 };
      acc[date].revenue += entry.revenue_cdf;
      acc[date].costs += entry.fuel_cdf + entry.maintenance_cdf;
      return acc;
    },
    {}
  );

  return Object.values(grouped).slice(-14);
}

export function vehicleMix(vehicles: DashboardVehicle[]) {
  return [
    { name: "Taxis", value: vehicles.filter((vehicle) => vehicle.type === "taxi").length },
    { name: "Motos", value: vehicles.filter((vehicle) => vehicle.type === "moto").length }
  ].filter((item) => item.value > 0);
}

export function weeklyRevenueByVehicle(
  entries: DashboardEntry[],
  vehicles: DashboardVehicle[]
) {
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const grouped = entries
    .filter((entry) => new Date(entry.entry_date) >= since)
    .reduce<Record<string, Record<string, string | number>>>((acc, entry) => {
      const date = new Intl.DateTimeFormat("fr-CD", { weekday: "short" }).format(
        new Date(entry.entry_date)
      );
      const vehicle = vehicleById.get(entry.vehicle_id);
      const label = vehicle?.label ?? "Vehicule";
      acc[date] ??= { date };
      acc[date][label] = Number(acc[date][label] ?? 0) + entry.revenue_cdf;
      return acc;
    }, {});

  return Object.values(grouped);
}

export function topDriverName(entries: DashboardEntry[], vehicles: DashboardVehicle[]) {
  const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const totals = entries.reduce<Record<string, number>>((acc, entry) => {
    const vehicle = vehiclesById.get(entry.vehicle_id);
    const name = vehicle?.driver_name ?? "Non assigne";
    acc[name] = (acc[name] ?? 0) + entry.revenue_cdf;
    return acc;
  }, {});

  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Aucun";
}

export type DriverProfileExtended = {
  id: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  is_owner_driver: boolean;
};

/**
 * Récupère le profil complet d'un chauffeur incluant is_owner_driver.
 * Utilisé par le dashboard chauffeur pour déterminer la branche d'affichage.
 */
export async function getDriverProfile(driverId: string): Promise<DriverProfileExtended | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,role,phone,is_owner_driver")
      .eq("id", driverId)
      .maybeSingle();

    if (error) {
      console.warn("[getDriverProfile] Erreur :", error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      full_name: (data as { full_name?: string | null }).full_name ?? null,
      role: data.role,
      phone: (data as { phone?: string | null }).phone ?? null,
      is_owner_driver: Boolean((data as { is_owner_driver?: boolean }).is_owner_driver)
    };
  } catch (err) {
    console.error("[getDriverProfile] Exception :", err);
    return null;
  }
}

export type DriverActiveContract = {
  id: string;
  contract_type: "employe" | "location_vente";
  status: string;
  possession_total_cdf: number | null;
  possession_paid_cdf: number | null;
  vehicle_id: string | null;
};

/**
 * Récupère le contrat actif d'un chauffeur depuis driver_contracts.
 * Retourne null si aucun contrat actif n'existe.
 */
export async function getDriverActiveContract(driverId: string): Promise<DriverActiveContract | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("driver_contracts")
      .select("id,contract_type,status,possession_total_cdf,possession_paid_cdf,vehicle_id")
      .eq("driver_id", driverId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[getDriverActiveContract] Erreur :", error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      contract_type: data.contract_type as "employe" | "location_vente",
      status: data.status,
      possession_total_cdf: data.possession_total_cdf ?? null,
      possession_paid_cdf: data.possession_paid_cdf ?? null,
      vehicle_id: data.vehicle_id ?? null
    };
  } catch (err) {
    console.error("[getDriverActiveContract] Exception :", err);
    return null;
  }
}

// ─── Données enrichies pour le portail investisseur ──────────────────────────

export type InvestorPayment = {
  id: string;
  amount: number;
  driver_id: string;
  driver_name: string | null;
  vehicle_id: string;
  vehicle_label: string | null;
  investor_id: string;
  status: PaymentStatus;
  source: string;
  payment_date: string;
  comment: string | null;
  created_at: string;
};

/**
 * Récupère les versements d'un investisseur, enrichis avec le nom du chauffeur
 * et le label du véhicule (double lookup + Map pour minimiser les requêtes).
 */
export async function getInvestorPayments(
  investorId: string,
  limit = 30
): Promise<InvestorPayment[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payments")
      .select("id,amount,driver_id,vehicle_id,investor_id,status,source,payment_date,comment,created_at")
      .eq("investor_id", investorId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[getInvestorPayments] Erreur :", error.message);
      return [];
    }

    const rows = data ?? [];
    const driverIds = Array.from(new Set(rows.map((r) => r.driver_id).filter(Boolean))) as string[];
    const vehicleIds = Array.from(new Set(rows.map((r) => r.vehicle_id).filter(Boolean))) as string[];

    // Lookup chauffeurs
    const driverNameById = new Map<string, string | null>();
    if (driverIds.length > 0) {
      const { data: drivers } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", driverIds);
      (drivers ?? []).forEach((d) => {
        driverNameById.set(d.id, (d as { full_name?: string | null }).full_name ?? null);
      });
    }

    // Lookup véhicules
    const vehicleLabelById = new Map<string, string | null>();
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id,label")
        .in("id", vehicleIds);
      (vehicles ?? []).forEach((v) => {
        vehicleLabelById.set(v.id, (v as { label?: string | null }).label ?? null);
      });
    }

    return rows.map((row) => ({
      id: row.id,
      amount: Number(row.amount ?? 0),
      driver_id: row.driver_id,
      driver_name: driverNameById.get(row.driver_id) ?? null,
      vehicle_id: row.vehicle_id,
      vehicle_label: vehicleLabelById.get(row.vehicle_id) ?? null,
      investor_id: row.investor_id,
      status: row.status as PaymentStatus,
      source: String((row as { source?: string }).source ?? "automated"),
      payment_date: (row as { payment_date?: string }).payment_date ?? row.created_at.slice(0, 10),
      comment: (row as { comment?: string | null }).comment ?? null,
      created_at: row.created_at
    }));
  } catch (err) {
    console.error("[getInvestorPayments] Exception :", err);
    return [];
  }
}

export type TrendPoint = { date: string; amount: number };

/**
 * Agrège les versements approuvés/validés d'un investisseur par jour
 * sur les N derniers jours. Retourne un tableau trié du plus ancien au plus récent.
 */
export async function getInvestorPaymentTrend(
  investorId: string,
  days = 30
): Promise<TrendPoint[]> {
  try {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("payments")
      .select("payment_date,amount,status")
      .eq("investor_id", investorId)
      .in("status", ["approved", "validated"])
      .gte("payment_date", sinceStr)
      .order("payment_date", { ascending: true });

    if (error) {
      console.warn("[getInvestorPaymentTrend] Erreur :", error.message);
      return [];
    }

    // Agréger par date
    const byDate = new Map<string, number>();
    (data ?? []).forEach((row) => {
      const d = (row as { payment_date?: string }).payment_date ?? "";
      byDate.set(d, (byDate.get(d) ?? 0) + Number(row.amount ?? 0));
    });

    // Construire le tableau complet (0 pour les jours sans versement)
    const result: TrendPoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const label = new Intl.DateTimeFormat("fr-CD", { day: "2-digit", month: "short" }).format(d);
      result.push({ date: label, amount: byDate.get(dateStr) ?? 0 });
    }

    return result;
  } catch (err) {
    console.error("[getInvestorPaymentTrend] Exception :", err);
    return [];
  }
}

/**
 * Agrège les versements approuvés/validés d'un chauffeur par jour
 * sur les N derniers jours. Retourne un tableau trié du plus ancien au plus récent.
 */
export async function getDriverPaymentTrend(
  driverId: string,
  days = 30
): Promise<TrendPoint[]> {
  try {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("payments")
      .select("payment_date,amount,status")
      .eq("driver_id", driverId)
      .in("status", ["approved", "validated"])
      .gte("payment_date", sinceStr)
      .order("payment_date", { ascending: true });

    if (error) {
      console.warn("[getDriverPaymentTrend] Erreur :", error.message);
      return [];
    }

    const byDate = new Map<string, number>();
    (data ?? []).forEach((row) => {
      const d = (row as { payment_date?: string }).payment_date ?? "";
      byDate.set(d, (byDate.get(d) ?? 0) + Number(row.amount ?? 0));
    });

    const result: TrendPoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const label = new Intl.DateTimeFormat("fr-CD", { day: "2-digit", month: "short" }).format(d);
      result.push({ date: label, amount: byDate.get(dateStr) ?? 0 });
    }

    return result;
  } catch (err) {
    console.error("[getDriverPaymentTrend] Exception :", err);
    return [];
  }
}

export type FleetDriver = { id: string; full_name: string | null };

/**
 * Récupère la liste des chauffeurs actuellement assignés à un véhicule
 * appartenant à l'investisseur connecté. Utilisé pour le dropdown du formulaire
 * de versement manuel.
 */
export async function getInvestorFleetDrivers(investorId: string): Promise<FleetDriver[]> {
  try {
    const supabase = await createClient();

    // Récupérer les vehicle driver_id depuis la flotte de l'investisseur
    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("driver_id")
      .eq("owner_id", investorId)
      .not("driver_id", "is", null);

    if (vErr || !vehicles || vehicles.length === 0) {
      return [];
    }

    const driverIds = Array.from(
      new Set((vehicles as { driver_id: string | null }[]).map((v) => v.driver_id).filter(Boolean))
    ) as string[];

    if (driverIds.length === 0) return [];

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", driverIds)
      .order("full_name");

    if (pErr) {
      console.warn("[getInvestorFleetDrivers] Erreur profils :", pErr.message);
      return [];
    }

    return (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: (p as { full_name?: string | null }).full_name ?? null
    }));
  } catch (err) {
    console.error("[getInvestorFleetDrivers] Exception :", err);
    return [];
  }
}

// ─── Pannes actives par véhicule (flotte investisseur) ────────────────────────

export type ActiveBreakdownSummary = {
  id: string;
  vehicle_id: string;
  type: string;
  status: BreakdownStatus;
  created_at: string;
};

/**
 * Récupère les pannes non résolues (open ou in_progress) pour tous les véhicules
 * d'un propriétaire. Retourne une Map<vehicle_id, ActiveBreakdownSummary>
 * contenant la panne la plus récente par véhicule — idéale pour enrichir une
 * liste de véhicules sans N+1 requêtes.
 */
export async function getOwnerActiveBreakdownsByVehicle(
  ownerId: string
): Promise<Map<string, ActiveBreakdownSummary>> {
  const result = new Map<string, ActiveBreakdownSummary>();

  try {
    const supabase = await createClient();

    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("id")
      .eq("owner_id", ownerId);

    if (vErr || !vehicles || vehicles.length === 0) return result;

    const vehicleIds = vehicles.map((v: { id: string }) => v.id);

    const { data, error } = await supabase
      .from("breakdowns")
      .select("id,vehicle_id,type,status,created_at")
      .in("vehicle_id", vehicleIds)
      .neq("status", "resolved")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[getOwnerActiveBreakdownsByVehicle] Erreur :", error.message);
      return result;
    }

    // Conserver seulement la panne la plus récente par véhicule
    for (const row of data ?? []) {
      if (!result.has(row.vehicle_id)) {
        result.set(row.vehicle_id, {
          id: row.id,
          vehicle_id: row.vehicle_id,
          type: row.type,
          status: row.status as BreakdownStatus,
          created_at: row.created_at
        });
      }
    }
  } catch (err) {
    console.error("[getOwnerActiveBreakdownsByVehicle] Exception :", err);
  }

  return result;
}
