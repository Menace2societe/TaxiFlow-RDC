import { NextResponse, type NextRequest } from "next/server";
import { csvResponse } from "@/lib/csv";
import { buildEntriesCsv, parseDateRange } from "@/lib/exports";
import { getCurrentProfile } from "@/lib/auth/roles";
import { ROUTES } from "@/lib/routes";
import { todayInAppTimezone } from "@/lib/time/kinshasa";

export const dynamic = "force-dynamic";

/** GET /dashboard/reports/export?from=YYYY-MM-DD&to=YYYY-MM-DD — recettes en CSV. */
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
  }

  const csv = await buildEntriesCsv(profile.id, parseDateRange(request.nextUrl.searchParams));
  return csvResponse(csv, `taxiflow-recettes-${todayInAppTimezone()}.csv`);
}
