import { endOfMonth, format, getDaysInMonth, startOfMonth } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

/**
 * La RDC a deux fuseaux : Kinshasa (UTC+1, ouest) et Lubumbashi (UTC+2, est).
 * NEXT_PUBLIC_APP_TIMEZONE permet de choisir celui de la flotte ; Kinshasa par défaut.
 */
export const DRC_TIMEZONES = ["Africa/Kinshasa", "Africa/Lubumbashi"] as const;
export type DrcTimezone = (typeof DRC_TIMEZONES)[number];

function resolveTimezone(value: string | undefined): DrcTimezone {
  return DRC_TIMEZONES.includes(value as DrcTimezone) ? (value as DrcTimezone) : "Africa/Kinshasa";
}

export const TZ: DrcTimezone = resolveTimezone(process.env.NEXT_PUBLIC_APP_TIMEZONE);

/** Date du jour (YYYY-MM-DD) dans le fuseau de la flotte, et non en UTC. */
export function todayInAppTimezone(now: Date = new Date(), timezone: string = TZ): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

/** Wall-calendar "now" in Kinshasa for month boundaries. */
export function kinshasaCalendarNow(): Date {
  return toZonedTime(new Date(), TZ);
}

/** Inclusive date range (YYYY-MM-DD) for the current calendar month in Kinshasa. */
export function kinshasaCurrentMonthRange(): { startDate: string; endDate: string; daysInMonth: number } {
  const z = kinshasaCalendarNow();
  const start = startOfMonth(z);
  const end = endOfMonth(z);
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    daysInMonth: getDaysInMonth(z)
  };
}

/** Les `days` derniers jours (YYYY-MM-DD) jusqu'à aujourd'hui inclus, dans le fuseau de la flotte. */
export function recentDates(days: number, now: Date = new Date(), timezone: string = TZ): string[] {
  const [year, month, day] = todayInAppTimezone(now, timezone).split("-").map(Number);
  return Array.from({ length: days }, (_, index) => {
    // Midi UTC : aucun changement de date possible, la RDC n'a pas d'heure d'été.
    const date = new Date(Date.UTC(year, month - 1, day - (days - 1 - index), 12));
    return date.toISOString().slice(0, 10);
  });
}

/** "2026-10-03" → "03 oct." */
export function shortDayLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-CD", { day: "2-digit", month: "short", timeZone: "UTC" }).format(
    new Date(`${isoDate}T12:00:00Z`)
  );
}
