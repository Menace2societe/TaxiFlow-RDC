import { NextResponse, type NextRequest } from "next/server";
import { csvResponse } from "@/lib/csv";
import { buildEntriesCsv, buildPaymentsCsv, parseDateRange } from "@/lib/exports";
import { getCurrentProfile } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

export const dynamic = "force-dynamic";

/**
 * GET /investor/revenue/export?type=payments|entries&from=…&to=…
 * Versements reçus (par défaut) ou recettes journalières, en CSV.
 */
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "investor") {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
  }

  const range = parseDateRange(request.nextUrl.searchParams);
  const type = request.nextUrl.searchParams.get("type") === "entries" ? "entries" : "payments";
  const csv = type === "entries" ? await buildEntriesCsv(profile.id, range) : await buildPaymentsCsv(profile.id, range);

  return csvResponse(csv, `taxiflow-${type === "entries" ? "recettes" : "versements"}-${todayInAppTimezone()}.csv`);
}
