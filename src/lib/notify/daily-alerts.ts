import "server-only";

import { documentTypeLabelByValue } from "@/lib/legal-documents/constants";
import { expiryLabel, reminderThreshold } from "@/lib/documents/expiry";
import { findContinuityAnomalies } from "@/lib/entries/continuity";
import { toPawapayMsisdn } from "@/lib/mobile-money/operators";
import { createServiceClient } from "@/lib/supabase/admin";
import type { DocumentType } from "@/lib/supabase/types";
import { recentDates, todayInAppTimezone } from "@/lib/time/kinshasa";
import { formatCDF } from "@/lib/utils/currency";
import { composeAlertMessage, type PendingAlert } from "./compose";
import { sendWhatsAppAlert } from "./whatsapp";

export type DailyAlertsReport = { owners: number; sent: number; failed: number; skipped: number; alerts: number };

function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "";
}

/**
 * Collecte, pour chaque investisseur, les alertes pas encore notifiées
 * (documents qui expirent, recettes suspectes, km non déclarés) et lui envoie
 * un seul message WhatsApp récapitulatif.
 */
export async function runDailyAlerts(): Promise<DailyAlertsReport> {
  const service = createServiceClient();
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");

  const today = todayInAppTimezone();
  const lookback = recentDates(8)[0];
  const in30Days = (() => {
    const [year, month, day] = today.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + 30, 12)).toISOString().slice(0, 10);
  })();

  const [{ data: documents }, { data: entries }, { data: vehicles }, { data: alreadySent }] = await Promise.all([
    service
      .from("legal_documents")
      .select("id,owner_id,document_type,document_name,expires_at,vehicle_id")
      .not("expires_at", "is", null)
      .lte("expires_at", in30Days),
    service
      .from("daily_entries")
      .select("id,owner_id,vehicle_id,entry_date,start_km,end_km,distance_covered,revenue_cdf,is_suspicious,review_status")
      .gte("entry_date", lookback),
    service.from("vehicles").select("id,label,plate_number"),
    service.from("notification_log").select("dedupe_key").eq("channel", "whatsapp").gte("created_at", `${recentDates(60)[0]}T00:00:00Z`)
  ]);

  const sentKeys = new Set((alreadySent ?? []).map((row) => row.dedupe_key));
  const vehicleLabel = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, `${vehicle.label} ${vehicle.plate_number}`]));
  const alertsByOwner = new Map<string, PendingAlert[]>();
  const push = (ownerId: string, alert: PendingAlert) => {
    if (sentKeys.has(alert.key)) return;
    alertsByOwner.set(ownerId, [...(alertsByOwner.get(ownerId) ?? []), alert]);
  };

  for (const document of documents ?? []) {
    const threshold = reminderThreshold(document.expires_at as string, today);
    if (threshold === null) continue;
    const name = documentTypeLabelByValue.get(document.document_type as DocumentType) ?? document.document_name;
    const vehicle = document.vehicle_id ? ` (${vehicleLabel.get(document.vehicle_id) ?? "véhicule"})` : "";
    push(document.owner_id, {
      key: `document_expiry:${document.id}:${threshold}`,
      text: `${name}${vehicle} : ${expiryLabel(document.expires_at, today).toLowerCase()}`
    });
  }

  for (const entry of entries ?? []) {
    if (!entry.is_suspicious || entry.review_status) continue;
    push(entry.owner_id, {
      key: `suspicious_entry:${entry.id}`,
      text: `Recette suspecte ${vehicleLabel.get(entry.vehicle_id) ?? "véhicule"} le ${entry.entry_date} : ${Number(
        entry.distance_covered
      )} km pour ${formatCDF(Number(entry.revenue_cdf))}`
    });
  }

  const entriesByOwner = new Map<string, NonNullable<typeof entries>>();
  for (const entry of entries ?? []) {
    entriesByOwner.set(entry.owner_id, [...(entriesByOwner.get(entry.owner_id) ?? []), entry]);
  }
  for (const [ownerId, ownerEntries] of entriesByOwner) {
    const anomalies = findContinuityAnomalies(
      ownerEntries.map((entry) => ({ ...entry, start_km: Number(entry.start_km), end_km: Number(entry.end_km) }))
    );
    for (const anomaly of anomalies) {
      push(ownerId, {
        key: `odometer:${anomaly.entry_id}`,
        text:
          anomaly.kind === "undeclared_km"
            ? `${vehicleLabel.get(anomaly.vehicle_id) ?? "Véhicule"} : ${anomaly.gap_km} km roulés sans recette avant le ${anomaly.entry_date}`
            : `${vehicleLabel.get(anomaly.vehicle_id) ?? "Véhicule"} : compteur reculé de ${-anomaly.gap_km} km le ${anomaly.entry_date}`
      });
    }
  }

  const ownerIds = Array.from(alertsByOwner.keys());
  const { data: owners } = ownerIds.length
    ? await service.from("profiles").select("id,phone").in("id", ownerIds)
    : { data: [] as { id: string; phone: string | null }[] };
  const phoneByOwner = new Map((owners ?? []).map((owner) => [owner.id, owner.phone]));

  const report: DailyAlertsReport = { owners: ownerIds.length, sent: 0, failed: 0, skipped: 0, alerts: 0 };
  const link = siteUrl() ? `${siteUrl()}/investor/control` : null;

  for (const [ownerId, alerts] of alertsByOwner) {
    report.alerts += alerts.length;
    const message = composeAlertMessage(alerts, link);
    const msisdn = toPawapayMsisdn(phoneByOwner.get(ownerId) ?? "");
    const result = msisdn ? await sendWhatsAppAlert(msisdn, message) : { status: "skipped" as const, error: "Pas de numéro RDC" };
    report[result.status] += 1;

    // Une alerte « skipped » (WhatsApp non configuré, pas de numéro) n'est pas journalisée :
    // elle partira quand la configuration sera complète.
    if (result.status === "skipped") continue;
    await service.from("notification_log").upsert(
      alerts.map((alert) => ({
        owner_id: ownerId,
        channel: "whatsapp" as const,
        dedupe_key: alert.key,
        message: alert.text,
        status: result.status,
        error: result.error ?? null
      })),
      { onConflict: "channel,dedupe_key", ignoreDuplicates: true }
    );
  }

  return report;
}
