"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getOwnerEntries,
  getOwnerNonResolvedBreakdownsCount,
  getOwnerVehicles,
  summarize,
  type DashboardEntry,
  type DashboardVehicle
} from "@/lib/dashboard/data";
import type { BreakdownStatus } from "@/lib/supabase/types";

export type InvestorDashboardBreakdown = {
  id: string;
  vehicle_id: string;
  vehicle_label: string;
  type: string;
  description: string | null;
  estimated_cost: number;
  status: BreakdownStatus;
  created_at: string;
};

export type InvestorDashboardData = {
  ok: true;
  vehicles: DashboardVehicle[];
  entries: DashboardEntry[];
  breakdowns: InvestorDashboardBreakdown[];
  stats: {
    totalRevenue: number;
    totalCosts: number;
    netRevenue: number;
    activeVehicles: number;
    totalVehicles: number;
    target: number;
    openBreakdowns: number;
  };
};

export type InvestorDashboardDataResult =
  | InvestorDashboardData
  | {
      ok: false;
      message: string;
      vehicles: [];
      entries: [];
      breakdowns: [];
      stats: InvestorDashboardData["stats"];
    };

const emptyStats = {
  totalRevenue: 0,
  totalCosts: 0,
  netRevenue: 0,
  activeVehicles: 0,
  totalVehicles: 0,
  target: 0,
  openBreakdowns: 0
};

export async function getInvestorDashboardData(): Promise<InvestorDashboardDataResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Session expiree. Reconnectez-vous pour charger votre espace investisseur.",
      vehicles: [],
      entries: [],
      breakdowns: [],
      stats: emptyStats
    };
  }

  const [vehicles, entries, openBreakdowns] = await Promise.all([
    getOwnerVehicles(user.id),
    getOwnerEntries(user.id),
    getOwnerNonResolvedBreakdownsCount(user.id)
  ]);

  const vehicleIds = vehicles.map((vehicle) => vehicle.id);
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  let breakdowns: InvestorDashboardBreakdown[] = [];

  if (vehicleIds.length > 0) {
    const { data } = await supabase
      .from("breakdowns")
      .select("id,vehicle_id,type,description,estimated_cost,status,created_at")
      .in("vehicle_id", vehicleIds)
      .order("created_at", { ascending: false })
      .limit(20);

    breakdowns = (data ?? []).map((breakdown) => ({
      id: breakdown.id,
      vehicle_id: breakdown.vehicle_id,
      vehicle_label: vehicleById.get(breakdown.vehicle_id)?.label ?? "Vehicule",
      type: breakdown.type,
      description: breakdown.description,
      estimated_cost: Number(breakdown.estimated_cost ?? 0),
      status: breakdown.status,
      created_at: breakdown.created_at
    }));
  }

  return {
    ok: true,
    vehicles,
    entries,
    breakdowns,
    stats: {
      ...summarize(entries, vehicles),
      openBreakdowns
    }
  };
}
