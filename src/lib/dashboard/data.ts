import { createClient } from "@/lib/supabase/server";
import type { EntryCurrency, VehicleStatus } from "@/lib/supabase/types";

export type DashboardVehicle = {
  id: string;
  label: string;
  plate_number: string;
  type: "taxi" | "moto";
  status: VehicleStatus;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  target_daily_revenue: number;
};

export type DashboardEntry = {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  entry_date: string;
  amount: number;
  currency: EntryCurrency;
  mileage_km: number;
  revenue_cdf: number;
  fuel_cdf: number;
  maintenance_cdf: number;
  notes: string | null;
};

export async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function getOwnerVehicles(ownerId: string): Promise<DashboardVehicle[]> {
  const supabase = await createClient();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id,label,plate_number,type,status,driver_id,target_daily_revenue")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  const driverIds = Array.from(new Set((vehicles ?? []).map((vehicle) => vehicle.driver_id).filter(Boolean))) as string[];
  const { data: drivers } = driverIds.length
    ? await supabase.from("profiles").select("id,full_name,phone").in("id", driverIds)
    : { data: [] };
  const driverById = new Map((drivers ?? []).map((driver) => [driver.id, driver]));

  return (vehicles ?? []).map((vehicle) => {
    const driver = vehicle.driver_id ? driverById.get(vehicle.driver_id) : null;

    return {
      ...vehicle,
      driver_name: driver?.full_name ?? null,
      driver_phone: driver?.phone ?? null
    };
  });
}

export async function getOwnerEntries(ownerId: string): Promise<DashboardEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_entries")
    .select("id,vehicle_id,driver_id,entry_date,amount,currency,mileage_km,revenue_cdf,fuel_cdf,maintenance_cdf,notes")
    .eq("owner_id", ownerId)
    .order("entry_date", { ascending: false })
    .limit(60);

  return data ?? [];
}

export function summarize(entries: DashboardEntry[], vehicles: DashboardVehicle[]) {
  const totalRevenue = entries.reduce((sum, entry) => sum + entry.revenue_cdf, 0);
  const totalCosts = entries.reduce((sum, entry) => sum + entry.fuel_cdf + entry.maintenance_cdf, 0);
  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === "active").length;
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
  const grouped = entries.reduce<Record<string, { date: string; revenue: number; costs: number }>>((acc, entry) => {
    const date = new Intl.DateTimeFormat("fr-CD", { day: "2-digit", month: "short" }).format(new Date(entry.entry_date));
    acc[date] ??= { date, revenue: 0, costs: 0 };
    acc[date].revenue += entry.revenue_cdf;
    acc[date].costs += entry.fuel_cdf + entry.maintenance_cdf;
    return acc;
  }, {});

  return Object.values(grouped).slice(-14);
}

export function vehicleMix(vehicles: DashboardVehicle[]) {
  return [
    { name: "Taxis", value: vehicles.filter((vehicle) => vehicle.type === "taxi").length },
    { name: "Motos", value: vehicles.filter((vehicle) => vehicle.type === "moto").length }
  ].filter((item) => item.value > 0);
}

export function weeklyRevenueByVehicle(entries: DashboardEntry[], vehicles: DashboardVehicle[]) {
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const grouped = entries
    .filter((entry) => new Date(entry.entry_date) >= since)
    .reduce<Record<string, Record<string, string | number>>>((acc, entry) => {
      const date = new Intl.DateTimeFormat("fr-CD", { weekday: "short" }).format(new Date(entry.entry_date));
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
