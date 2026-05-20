import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function InvestorRootPage() {
  redirect(ROUTES.INVESTOR_DASHBOARD);
}
