import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function DriverRootPage() {
  redirect(ROUTES.DRIVER_PORTAL);
}
