import { endOfMonth, format, getDaysInMonth, startOfMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TZ = "Africa/Kinshasa";

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
