import type { VehicleStatus } from "@/lib/supabase/types";

/**
 * Les anciennes bases utilisaient active / inactive (ou des variantes saisies à la
 * main). On ramène tout aux trois statuts de l'application.
 */
export function normalizeVehicleStatus(raw: string | null | undefined): VehicleStatus {
  const value = (raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  if (["en service", "active", "actif", "service", "in service"].includes(value)) return "en service";
  if (["maintenance", "en maintenance", "en panne", "panne", "garage", "en reparation", "reparation"].includes(value)) {
    return "maintenance";
  }
  return "repos";
}
