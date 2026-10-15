import "server-only";

import { daysUntil } from "@/lib/documents/expiry";
import { findContinuityAnomalies, findMissingDays, type ContinuityAnomaly } from "@/lib/entries/continuity";
import { createClient } from "@/lib/supabase/server";
import type { EntryReviewStatus } from "@/lib/supabase/types";
import { recentDates, todayInAppTimezone } from "@/lib/time/kinshasa";

const LOOKBACK_DAYS = 60;
const MISSING_DAYS_WINDOW = 7;
const PHOTO_URL_TTL_SECONDS = 60 * 30;

export type ControlEntry = {
  id: string;
  vehicle_id: string;
  vehicle_label: string;
  driver_name: string | null;
  entry_date: string;
  start_km: number;
  end_km: number;
  distance_covered: number;
  revenue_cdf: number;
  is_suspicious: boolean;
  photo_url: string | null;
  has_photo: boolean;
  review_status: EntryReviewStatus | null;
  review_note: string | null;
};

export type ControlData = {
  today: string;
  toReview: ControlEntry[];
  reviewed: ControlEntry[];
  withoutPhoto: ControlEntry[];
  continuity: (ContinuityAnomaly & { vehicle_label: string })[];
  missingDays: { vehicle_id: string; vehicle_label: string; date: string }[];
  expiringDocuments: {
    id: string;
    document_name: string;
    document_type: string;
    expires_at: string;
    days_left: number;
    vehicle_label: string | null;
  }[];
};

export async function getControlData(ownerId: string): Promise<ControlData> {
  const supabase = await createClient();
  const today = todayInAppTimezone();
  const since = recentDates(LOOKBACK_DAYS)[0];

  const [{ data: vehicles }, { data: entries }, { data: documents }] = await Promise.all([
    supabase.from("vehicles").select("id,label,plate_number,status").eq("owner_id", ownerId),
    supabase
      .from("daily_entries")
      .select(
        "id,vehicle_id,driver_id,entry_date,start_km,end_km,distance_covered,revenue_cdf,is_suspicious,odometer_photo_path,review_status,review_note"
      )
      .eq("owner_id", ownerId)
      .gte("entry_date", since)
      .order("entry_date", { ascending: false }),
    supabase
      .from("legal_documents")
      .select("id,document_name,document_type,expires_at,vehicle_id")
      .eq("owner_id", ownerId)
      .not("expires_at", "is", null)
      .order("expires_at", { ascending: true })
  ]);

  const vehicleLabel = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, `${vehicle.label} · ${vehicle.plate_number}`]));
  const rows = entries ?? [];

  const driverIds = Array.from(new Set(rows.map((row) => row.driver_id).filter(Boolean))) as string[];
  const { data: drivers } = driverIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", driverIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const driverName = new Map((drivers ?? []).map((driver) => [driver.id, driver.full_name]));

  // Photos signées uniquement pour les recettes affichées en revue.
  const photoPaths = rows
    .filter((row) => row.is_suspicious && row.odometer_photo_path)
    .map((row) => row.odometer_photo_path as string);
  const photoUrl = new Map<string, string>();
  if (photoPaths.length) {
    const { data: signed } = await supabase.storage.from("odometer-photos").createSignedUrls(photoPaths, PHOTO_URL_TTL_SECONDS);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) photoUrl.set(item.path, item.signedUrl);
    }
  }

  const toControlEntry = (row: (typeof rows)[number]): ControlEntry => ({
    id: row.id,
    vehicle_id: row.vehicle_id,
    vehicle_label: vehicleLabel.get(row.vehicle_id) ?? "Véhicule",
    driver_name: (row.driver_id && driverName.get(row.driver_id)) || null,
    entry_date: row.entry_date,
    start_km: Number(row.start_km ?? 0),
    end_km: Number(row.end_km ?? 0),
    distance_covered: Number(row.distance_covered ?? 0),
    revenue_cdf: Number(row.revenue_cdf ?? 0),
    is_suspicious: Boolean(row.is_suspicious),
    photo_url: row.odometer_photo_path ? (photoUrl.get(row.odometer_photo_path) ?? null) : null,
    has_photo: Boolean(row.odometer_photo_path),
    review_status: row.review_status ?? null,
    review_note: row.review_note ?? null
  });

  const controlEntries = rows.map(toControlEntry);
  const recentWindow = new Set(recentDates(14));

  const activeVehicleIds = (vehicles ?? []).filter((vehicle) => vehicle.status === "en service").map((vehicle) => vehicle.id);
  // Fenêtre des 7 derniers jours, sans aujourd'hui (la journée n'est pas finie).
  const checkedDays = recentDates(MISSING_DAYS_WINDOW + 1).slice(0, -1);

  return {
    today,
    toReview: controlEntries.filter((entry) => entry.is_suspicious && !entry.review_status),
    reviewed: controlEntries.filter((entry) => entry.is_suspicious && entry.review_status).slice(0, 20),
    withoutPhoto: controlEntries.filter((entry) => !entry.has_photo && recentWindow.has(entry.entry_date)),
    continuity: findContinuityAnomalies(
      rows.map((row) => ({
        id: row.id,
        vehicle_id: row.vehicle_id,
        entry_date: row.entry_date,
        start_km: Number(row.start_km ?? 0),
        end_km: Number(row.end_km ?? 0)
      }))
    ).map((anomaly) => ({ ...anomaly, vehicle_label: vehicleLabel.get(anomaly.vehicle_id) ?? "Véhicule" })),
    missingDays: findMissingDays(rows, activeVehicleIds, checkedDays).map((missing) => ({
      ...missing,
      vehicle_label: vehicleLabel.get(missing.vehicle_id) ?? "Véhicule"
    })),
    expiringDocuments: (documents ?? [])
      .map((document) => ({
        id: document.id,
        document_name: document.document_name,
        document_type: document.document_type,
        expires_at: document.expires_at as string,
        days_left: daysUntil(document.expires_at as string, today),
        vehicle_label: document.vehicle_id ? (vehicleLabel.get(document.vehicle_id) ?? null) : null
      }))
      .filter((document) => document.days_left <= 30)
  };
}
