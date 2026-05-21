import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/**
 * /investor → redirects immediately to /investor/dashboard.
 * The parent layout.tsx already handles the requireRole("investor") guard,
 * so by the time this runs the user is guaranteed to be an authenticated investor.
 */
export default function InvestorRootPage() {
  redirect(ROUTES.INVESTOR_DASHBOARD);
}
