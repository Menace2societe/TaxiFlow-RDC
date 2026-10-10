import { NextResponse } from "next/server";
import { runDailyAlerts } from "@/lib/notify/daily-alerts";

export const dynamic = "force-dynamic";

/**
 * Tâche quotidienne (vercel.json → crons). Vercel envoie
 * « Authorization: Bearer $CRON_SECRET » ; toute autre requête est refusée.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runDailyAlerts());
  } catch (error) {
    console.error("[cron/daily-alerts]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
